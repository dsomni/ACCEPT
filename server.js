// Connecting Modules
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const config = require('./config/configs');
const expressLayouts = require('express-ejs-layouts');
const childProcess = require("child_process");
const Adder = require(__dirname + '/public/scripts/Adder.js');
const Fuse = require('fuse.js');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require("bcryptjs");
const morgan = require("morgan");
const multer = require("multer");
const StreamZip = require('node-stream-zip');
const nodemailer = require("nodemailer");
require("dotenv").config();
const app = express();
//---------------------------------------------------------------------------------
// Queue setup

let TestingQueue = []

function pushToQueue(object) {
  TestingQueue.push(object);
}

async function popQueue() {
  let object = TestingQueue.shift();
  let user = await User.findOne({ login: object.login }).exec();
  if (!user)
    return
  user.attempts.unshift({
    taskID: object.id, date: object.sendAt,
    programText: object.programText, result: [], language: object.language
  });
  user.markModified("attempts");
  await user.save();

  fs.mkdirSync(path.normalize(__dirname + '/public/processes/' + object.login + "_" + object.id));
  fs.writeFileSync(path.normalize('public/processes/' + object.login + "_" + object.id + "/programText.txt"), object.programText, "utf-8");
  childProcess.exec(object.command);

  return object;
}

//---------------------------------------------------------------------------------
// Gmail setup
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'accept.report@gmail.com',
    pass: 'accept3!',
  },
})

//---------------------------------------------------------------------------------
// Multer setup
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, './public/media/newsImages');
    },
    filename: (req, file, callback) => {
      callback(null, Date.now() + "." + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
  })
});

const uploadCode = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, './public/codes');
    },
    filename: (req, file, callback) => {
      callback(null, Date.now() + "." + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
  })
});

const uploadTests = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, './public/tests');
    },
    filename: (req, file, callback) => {
      callback(null, Date.now() + "." + file.originalname.split('.')[file.originalname.split('.').length - 1]);
    }
  })
});


//---------------------------------------------------------------------------------
// MongoDB connecting
let connectionString;
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
  connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName;
} else {
  connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName;
};

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.connection.on('connected', () => {
  console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
  console.log("Error while connecting to DB: " + err);
});

mongoose.set('useCreateIndex', true);

const User = require('./config/models/User');
const Task = require('./config/models/Task');
const News = require('./config/models/News');
const Lesson = require('./config/models/Lesson');
const Tournament = require('./config/models/Tournament');
const Quiz = require('./config/models/Quiz');

//---------------------------------------------------------------------------------

const initializePassport = require('./config/passport');
const configs = require('./config/configs');
initializePassport(
  passport,
  User
);

//---------------------------------------------------------------------------------
// Settings
app.set('view-engine', 'ejs');
app.use(morgan(':method   :date[web]   :url   :status', {
  skip: function (req, res) { return (req.url.slice(-4) == ".svg" || req.url.slice(-4) == ".css" || req.url.slice(-3) == ".ng") || (req.user && !req.user.isTeacher) },
  stream: fs.createWriteStream(path.join(__dirname, 'public/logs/' + (new Date(Date.now())).toISOString().split(':').join('_') + '.log'), { flags: 'a' })
}));
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static('public')); //where search for static files

app.use(expressLayouts);
app.set('layout', 'layout.ejs');
app.use(flash());
app.use(session({
  secret: config.secret,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

childProcess.exec('chcp 65001 | dir');

//---------------------------------------------------------------------------------
// Loading from DB
let news;
async function load() {
  news = await News.find({}).exec();
  news.reverse();
}
load();

//---------------------------------------------------------------------------------
// Checking tournaments
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/Tchecker.js'));

//---------------------------------------------------------------------------------
// Checking tasks
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/TaskAutoChecker.js'));

//---------------------------------------------------------------------------------
// Main Page
app.get('/', (req, res) => {
  if (req.user) {
    res.render('main.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Main Page",
      isTeacher: req.user.isTeacher,
      news: news ? news.slice(0, config.onPage.newsMain) : [],
      location: undefined
    });
  } else {
    res.render('main.ejs', {
      login: "",
      name: "",
      title: "Main Page",
      isTeacher: false,
      news: news ? news.slice(0, config.onPage.newsMain) : [],
      location: undefined
    });
  };
});

app.post('/', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/',
  failureFlash: true
}));

//---------------------------------------------------------------------------------
// Task Page
app.get('/task/page/:id', checkAuthenticated, checkNletter, async (req, res) => {
  let problem = await Task.findOne({ identificator: req.params.id }).exec();
  if (!problem) {
    return res.redirect("/tasks/1/default&all&all&false&all")
  }
  let showHint = req.user.attempts.filter(item => item.taskID == req.params.id).length >= problem.hint.attemptsForHint;
  let attempts = req.user.attempts;
  let prevCode = "";
  let language = "";
  for (let i = 0; i < attempts.length; i++) {
    if (attempts[i].taskID == req.params.id) {
      prevCode = attempts[i].programText;
      language = attempts[i].language;
      break;
    }
  }
  res.render('Task/page.ejs', {
    login: req.user.login,
    ID: req.params.id,
    name: req.user.name,
    title: "Task " + req.params.id,
    isTeacher: req.user.isTeacher,
    problem: problem,
    prevCode: prevCode,
    showHint: showHint,
    language: language,
    location: "/tasks/1/default&all&all&false&all"
  });
});
// Task Page listener
app.post('/task/page/:id', checkAuthenticated, checkNletter, uploadCode.single('file'), async (req, res) => {
  fs.stat(path.normalize('public/processes/' + req.user.login + "_" + req.params.id), async function (err) {
    let isInQueue = TestingQueue.findIndex(item => (item.id == req.params.id && item.login == req.user.login));
    if (!err || isInQueue != -1) {
      res.redirect('/task/page/' + req.params.id);
    }
    else if (err.code === 'ENOENT') {

      let prevCode = ""
      let attempts = req.user.attempts;
      for (let i = 0; i < attempts.length; i++) {
        if (attempts[i].taskID == req.params.id) {
          prevCode = attempts[i].programText;
          result = attempts[i].result;
          break;
        }
      }
      let language, programText;
      language = req.body.languageSelector;
      if (req.file) {
        try {
          let filepath = path.join(__dirname, '/public/codes/' + req.file.filename);
          programText = fs.readFileSync(filepath, "utf8");
          childProcess.exec('del /q \"' + filepath + '\"');

        } catch (err) {
          console.log(err)
        }

      } else {
        programText = req.body.code;
      }
      if (prevCode == "" || prevCode != programText || req.file) {

        let sendAt = Date.now().toString();

        let object = {
          login: req.user.login,
          id: req.params.id,
          programText,
          language,
          sendAt,
          command: 'node ' + path.join(__dirname, '/public/checker/checker3' + language + '.js ') + ' ' +
            path.join(__dirname, '/public/processes/' + req.user.login + "_" + req.params.id) + " " +
            'program' + req.user.login + "_" + req.params.id + " " +
            req.params.id
        }
        pushToQueue(object);
      }

      res.redirect('/task/page/' + req.params.id);
    }
  });
})


//---------------------------------------------------------------------------------
// Add Task Page
app.get('/task/add', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  res.render('Task/add.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Add Task",
    isTeacher: req.user.isTeacher,
    location: "/tasks/1/default&all&all&false&all"
  })
})

app.post('/task/add', checkAuthenticated, checkNletter, checkPermission, uploadTests.single('file'), async (req, res) => {
  let user = req.user;
  let body = req.body;

  let examples = [];
  let exI, exO;
  for (let i = 0; i < 5; i++) {
    eval("exI = body.exampleIn" + i)
    eval("exO = body.exampleOut" + i)
    if (exI == "" || exO == "") break;
    examples.push([exI.trim(), exO.trim()]);
  }

  let tests = [];
  if (req.file) {
    try {
      let filepath = path.join(__dirname, '/public/tests/' + req.file.filename)
      const zip = new StreamZip.async({ file: filepath });

      const entriesCount = await zip.entriesCount;

      for (let i = 0; i < entriesCount / 2; i++) {
        let inp = await zip.entryData("input" + i + ".txt");
        let out = await zip.entryData("output" + i + ".txt");
        tests.push([inp.toString('utf8').trim(), out.toString('utf8').trim()])
      }

      await zip.close();
      childProcess.exec('del /q \"' + filepath + '\"');

    } catch (err) {
      console.log(err)
    }
  } else {
    let tI, tO;
    for (let i = 0; i < 20; i++) {
      eval("tI = body.testIn" + i)
      eval("tO = body.testOut" + i)
      if (tI == "" || tO == "") break;
      tests.push([tI.trim(), tO.trim()]);
    }
  }

  let hint;
  let hintText = body.hint;
  let attemptsForHint = body.attemptsForHint;
  if (hintText && attemptsForHint) {
    hint = {
      text: hintText,
      attemptsForHint: attemptsForHint,
      doesExist: true
    }
  } else {
    hint = {
      text: '',
      attemptsForHint: 0,
      doesExist: false
    }
  }

  await Adder.addTask(Task, body.title.trim(), body.statement.trim(), body.input.trim(), body.output.trim(), examples, tests, body.topic.trim(), body.grade, hint, user.name);

  res.redirect(`/tasks/1/default&all&all&false&all`)
})

//---------------------------------------------------------------------------------
// Tasks List Page
app.get('/tasks/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {
  let user = req.user;
  let teachers = await User.find({ isTeacher: true });
  teachers = teachers.map(item => item.name);
  let foundTasks = []
  let a = req.params.search.split('&');
  let tasks;
  SortByNew = a[3] == "true";
  if (a[0] != "default" || a[1] != "all" || a[2] != "all" || a[3] != "false" || a[4] != "all") {
    toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    SearchTopic = a[1].toUpperCase();
    SearchGrade = a[2]
    author = a[4]

    let properties = {}
    if (SearchGrade != "all") properties.grade = SearchGrade;
    if (author != "all") properties.author = author.replace("%20", ' ');
    tasks = await Task.find(properties).exec();


    const fuse = new Fuse(tasks, {
      includeScore: true,
      keys: ["title"]
    });
    if (toSearch == "") {
      tasks.forEach(task => {
        if ((task.topic.split(" ").join("").trim().toUpperCase() == SearchTopic || SearchTopic == "ALL")) {
          foundTasks.push(task);
        }
      })
    } else {
      fuse.search(toSearch).forEach(task => {
        if ((task.score < 0.5) && (task.item.topic.split(" ").join("").trim().toUpperCase() == SearchTopic || SearchTopic == "ALL")) {
          foundTasks.push(task.item);
        }
      });
    }

    if (SortByNew) foundTasks = foundTasks.reverse();

  } else {
    tasks = await Task.find({}).exec();
  }
  let topics = [];

  for (let i = 0; i < tasks.length; i++) {
    if (topics.indexOf(tasks[i].topic) == -1) {
      topics.push(tasks[i].topic);
    }
  }
  if (foundTasks.length == 0) {
    foundTasks = tasks;
    if (SortByNew) foundTasks = foundTasks.reverse();
  }
  let onPage = config.onPage.tasks;
  let pageInfo = `${(req.params.page - 1) * onPage + 1} - ${min(req.params.page * onPage, foundTasks.length)} из ${foundTasks.length}`;
  let pages = Math.ceil(foundTasks.length / onPage);
  foundTasks = foundTasks.map(item => item.identificator).slice((req.params.page - 1) * onPage, req.params.page * onPage).join('|');

  res.render('tasks.ejs', {
    login: user.login,
    name: req.user.name,
    foundTasks,
    title: "Tasks List",
    tasks: foundTasks,
    isTeacher: req.user.isTeacher,
    pageInfo,
    pages,
    page: req.params.page,
    search: req.params.search,
    topics: topics,
    teachers,
    location: req.header('Referer')
  })
})

app.post('/tasks/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.TopicSelector + '&' + req.body.GradeSelector + '&' + req.body.SortByNew + "&" + req.body.Author;
  res.redirect('/tasks/' + req.params.page.toString() + '/' + toSearch)
})

//---------------------------------------------------------------------------------
// Edit Task Page
app.get('/task/edit/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let problem = await Task.findOne({ identificator: req.params.id }).exec()
  let user = req.user;
  res.render('Task/edit.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Edit Task",
    isTeacher: req.user.isTeacher,
    problem: problem,
    location: "/task/page/" + req.params.id
  })
})

app.post('/task/edit/:id', checkAuthenticated, checkNletter, checkPermission, uploadTests.single('file'), async (req, res) => {
  let body = req.body;
  let problem = await Task.findOne({ identificator: req.params.id }).exec();

  let examples = [];
  let exI, exO;
  for (let i = 0; i < 5; i++) {
    eval("exI = body.exampleIn" + i)
    eval("exO = body.exampleOut" + i)
    if (exI == "" || exO == "") break;
    examples.push([exI.trim(), exO.trim()]);
  }

  let tests = [];
  if (req.file) {
    try {
      let filepath = path.join(__dirname, '/public/tests/' + req.file.filename)
      const zip = new StreamZip.async({ file: filepath });

      const entriesCount = await zip.entriesCount;

      for (let i = 0; i < entriesCount / 2; i++) {
        let inp = await zip.entryData("input" + i + ".txt");
        let out = await zip.entryData("output" + i + ".txt");
        tests.push([inp.toString('utf8').trim(), out.toString('utf8').trim()])
      }

      await zip.close();
      childProcess.exec('del /q \"' + filepath + '\"');

    } catch (err) {
      console.log(err)
    }
  } else {
    let tI, tO;
    for (let i = 0; i < 20; i++) {
      eval("tI = body.testIn" + i)
      eval("tO = body.testOut" + i)
      if (tI == "" || tO == "") break;
      tests.push([tI.trim(), tO.trim()]);
    }
  }

  let hint;
  let hintText = body.hint;
  let attemptsForHint = body.attemptsForHint;
  if (hintText && attemptsForHint) {
    hint = {
      text: hintText,
      attemptsForHint: attemptsForHint,
      doesExist: true
    }
  } else {
    hint = {
      text: '',
      attemptsForHint: 0,
      doesExist: false
    }
  }

  problem.title = body.title.trim();
  problem.statement = body.statement.trim();
  problem.input = body.input.trim();
  problem.output = body.output.trim();
  problem.topic = body.topic.trim();
  problem.examples = examples;
  problem.tests = tests;
  problem.hint = hint;
  await problem.save();
  res.redirect('/task/page/' + req.params.id);
});

//---------------------------------------------------------------------------------
// Delete Task
app.post('/task/delete/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {

  childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteTask.js") + " " + req.params.id)

  res.redirect('/tasks/1/default&all&all&false&all')
})

//---------------------------------------------------------------------------------
// Account Page
app.get('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
  let user;
  if (req.user.login == req.params.login) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  if (user) {
    let tasks = await Task.find({}).exec();
    let tournaments = await Tournament.find({}).exec();
    let attempts = user.attempts;
    let foundAttempts = [];

    let a = req.params.search.split('&');
    let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    let types = a[1];
    let tourTask = [];
    let task;

    tournaments.forEach(tournament => tournament.tasks.forEach(task => tourTask.push(task)));
    for (let i = 0; i < attempts.length; i++) {
      verylongresult = getVerdict(attempts[i].result);
      if ((types == 'all') || (verylongresult == 'OK')) {
        if (attempts[i].taskID.split('_')[0] != '0')
          task = tourTask.find(item => item.identificator == attempts[i].taskID);
        else
          task = tasks.find(item => item.identificator == attempts[i].taskID);
        if (task && task.title.slice(0, toSearch.length).toUpperCase() == toSearch) {
          foundAttempts.push(attempts[i]);
        }
      }
    }

    let onPage = config.onPage.attempts;
    let page = req.params.page;
    let pages = Math.ceil(foundAttempts.length / onPage);
    let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, foundAttempts.length)} из ${foundAttempts.length}`;

    res.render('Account/account.ejs', {
      login: req.user.login,
      u_login: user.login,
      name: req.user.name,
      title: "Account",
      pageInfo,
      page,
      pages,
      isTeacher: req.user.isTeacher,
      search: req.params.search,
      n_name: user.name,
      user: user,
      location: req.header('Referer')
    })

  } else {
    res.redirect('/account/' + req.user.login + '/1/default&all')
  }
})

app.post('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.selector;
  res.redirect('/account/' + req.params.login.toString() + '/' + req.params.page.toString() + '/' + toSearch)
})

//---------------------------------------------------------------------------------
// Attempt Page
app.get('/attempt/:login/:date', checkAuthenticated, checkValidation, async (req, res) => {
  let user;
  if (req.user.login == req.params.login) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  if (user) {

    let attempts = user.attempts;
    let attempt;

    for (let i = 0; i < attempts.length; i++) {
      if (attempts[i].date == req.params.date) {
        attempt = attempts[i];
        break;
      }
    }

    if (attempt) {
      res.render('Account/attempt.ejs', {
        login: user.login,
        name: req.user.name,
        title: "Attempt",
        isTeacher: req.user.isTeacher,
        RESULT: attempt.result,
        code: attempt.programText,
        taskID: attempt.taskID,
        date: attempt.date,
        n_name: user.name,
        language: attempt.language,
        location: `/account/${req.params.login}/1/default&all`
      })
    } else {
      res.redirect('/account/' + req.user.login + '/1/default&all')
    }

  } else {
    res.redirect('/account/' + req.user.login + '/1/default&all')
  }

})

//---------------------------------------------------------------------------------
// Add Lesson Page
app.get('/addlesson', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  res.render('Lesson/add.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Add Lesson",
    isTeacher: req.user.isTeacher,
    location: `/lessons/${user.login}/1/default&all&true&all`
  })
})

app.post('/addlesson', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  let body = req.body;

  let tasksToAdd = [];
  let tasks = body.tasks.split(' ').map(item => '0_' + (parseInt(item) - 1));
  for (let i = 0; i < tasks.length; i++) {
    task = await Task.findOne({ identificator: tasks[i] }).exec();
    if (task)
      tasksToAdd.push(tasks[i]);
  }
  await Adder.addLesson(Lesson, body.grade, body.title, body.description, tasksToAdd, user.name);

  res.redirect('/addlesson');
});

//---------------------------------------------------------------------------------
// Lessons List Page
app.get('/lessons/:login/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {

  let user;
  if (req.user.login == req.params.login || !req.user.isTeacher) {
    user = req.user;

  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  let teachers = await User.find({ isTeacher: true });
  teachers = teachers.map(item => item.name);


  let a = req.params.search.split('&');
  let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
  let SearchGrade = a[1]
  let SortByNew = a[2] == "false";
  let author = a[3] ? a[3].replace(/%20/g, " ") : "all";
  let usedLessons;
  let properties = {}
  if (author != "all") properties.author = author;
  if (SearchGrade != "all" || !user.isTeacher) properties.grade = user.isTeacher ? SearchGrade : user.grade;
  let lessons = (await Lesson.find(properties).exec());

  // if (lessons.length!=0 && lessons[0].identificator == 0) lessons.splice(0, 1);

  const fuse = new Fuse(lessons, {
    includeScore: true,
    keys: ["title"]
  });

  usedLessons = [];
  if (toSearch != "")
    fuse.search(toSearch).forEach(lesson => {
      if (lesson.score < 0.5) {
        usedLessons.push(lesson.item);
      }
    });
  if (usedLessons.length != 0)
    lessons = usedLessons;

  if (SortByNew) {
    lessons = lessons.reverse();
  }
  let onPage = config.onPage.lessons;
  let page = req.params.page;
  let pages = Math.ceil(lessons.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, lessons.length)} из ${lessons.length}`;
  lessons = lessons.slice((page - 1) * onPage, page * onPage);
  let ids = lessons.map(item => item.identificator).join('|');


  res.render('lessons.ejs', {
    u_login: user.login,
    n_name: user.name,
    login: req.user.login,
    name: req.user.name,
    title: "Lessons List",
    lessons,
    isTeacher: req.user.isTeacher,
    ids,
    page,
    pages,
    pageInfo,
    search: req.params.search,
    teachers,
    location: req.header('Referer')
  })
})

app.post('/lessons/:login/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + (req.body.GradeSelector || 'all') + "&" + req.body.SortByNew + "&" + req.body.Author;
  res.redirect('/lessons/' + req.params.login + '/' + req.params.page.toString() + '/' + toSearch)
})

//---------------------------------------------------------------------------------
// Lesson Page
app.get('/lesson/:login/:id', checkAuthenticated, checkNletter, isLessonAvailable, async (req, res) => {

  let user;
  if (req.user.login == req.params.login) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  lesson = await Lesson.findOne({ identificator: req.params.id }).exec();
  let ids = lesson.tasks.join("|");
  if (!lesson) {
    res.redirect("/lessons/" + req.params.login + "/1/default&all&true&all")
  } else {
    let tasks = lesson.tasks.join('|');
    res.render('Lesson/lesson.ejs', {
      ID: lesson.identificator,
      u_login: user.login,
      u_name: user.name,
      login: req.user.login,
      name: req.user.name,
      title: "Lesson",
      ids,
      isTeacher: req.user.isTeacher,
      lesson: lesson,
      foundTasks: tasks,
      location: `/lessons/${user.login}/1/default&all&true&all`
    })
  }
})

//---------------------------------------------------------------------------------
// Delete Lesson
app.post('/deletelesson/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteLesson.js") + " " + req.params.id)
  res.redirect('/lessons/' + req.user.login + '/1/default&all&true&all');
})

//---------------------------------------------------------------------------------
// Edit Lesson Page
app.get('/editlesson/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let lesson = await Lesson.findOne({ identificator: req.params.id }).exec();
  lesson.tasks = lesson.tasks.map(item => parseInt(item.split('_')[1]) + 1);
  let user = req.user;
  res.render('Lesson/edit.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Edit Lesson",
    isTeacher: req.user.isTeacher,
    lesson: lesson,
    location: `/lesson/${user.login}/${req.params.id}`
  });
});

app.post('/editlesson/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  let body = req.body;
  let lesson = await Lesson.findOne({ identificator: req.params.id }).exec()

  lesson.title = body.title;
  lesson.description = body.description;
  lesson.grade = body.grade;
  let tasks = body.tasks.split(' ').map(item => '0_' + (parseInt(item) - 1));
  lesson.tasks = [];
  for (let i = 0; i < tasks.length; i++) {
    task = await Task.findOne({ identificator: tasks[i] }).exec();
    if (task)
      lesson.tasks.push(tasks[i]);
  }

  lesson.markModified("tasks");

  await lesson.save();

  res.redirect(`/lesson/${user.login}/${req.params.id}`);
});

//---------------------------------------------------------------------------------
// Lesson Results Page
app.get('/lessonresults/:id/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  lesson = await Lesson.findOne({ identificator: req.params.id }).exec();

  if (!lesson) {
    res.redirect("/lessons/" + req.params.login + "/1/default&all&all")
  } else {
    let results = [];
    let foundStudents;
    let students;

    let a = req.params.search.split('&');
    if (a[1].toLowerCase() != "default") {
      let SearchGrade = a[1] == "all" ? '' : a[1];
      if (SearchGrade != "") {
        students = await User.find({ grade: SearchGrade, isTeacher: false }).exec();
      } else {
        students = await User.find({ isTeacher: false }).exec();
      }
      if (a[0] != "default" || a[2] != "all" || a[3] != "all") {
        let SearchLetter = a[2] == "all" ? '' : a[2].toUpperCase();
        let SearchGroup = a[3] == "all" ? '' : a[3];
        foundStudents = [];
        students.forEach(student => {
          if ((student.gradeLetter.toUpperCase() == SearchLetter || SearchLetter == "") && (student.group == SearchGroup || SearchGroup == "")) {
            foundStudents.push(student);
          }
        });
      } else {
        foundStudents = students;
      }
    }
    // if(foundStudents.length == 0)
    //     foundStudents = await User.find({ isTeacher: false }).exec();
    foundStudents.sort((a, b) => { return a.name > b.name });

    let onPage = config.onPage.students;
    let page = req.params.page;
    let pages = Math.ceil(foundStudents.length / onPage);
    let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, foundStudents.length)} из ${foundStudents.length}`;
    let logins = foundStudents.slice((page - 1) * onPage, page * onPage).map(item => item.login).join("|");

    res.render('Lesson/results.ejs', {
      ID: lesson.identificator,
      login: req.user.login,
      name: req.user.name,
      title: "Lesson Results",
      isTeacher: req.user.isTeacher,
      lesson: lesson,
      page,
      pages,
      pageInfo,
      search: req.params.search,
      logins,
      location: `/lesson/${req.user.login}/${req.params.id}`
    })
  }
});

app.post('/lessonresults/:id/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.GradeSelector +
    '&' + (req.body.gradeLetter || "all") +
    '&' + (req.body.Group || "all")
  res.redirect('/lessonresults/' + req.params.id + '/' + req.params.page + '/' + toSearch)
});


//---------------------------------------------------------------------------------
// Students List Page
app.get('/students/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  let foundStudents;
  let students;

  let a = req.params.search.split('&');
  let SearchGrade = a[1] == "all" ? '' : a[1];
  if (SearchGrade != "") {
    students = await User.find({ grade: SearchGrade, isTeacher: false }).exec();
  } else {
    students = await User.find({ isTeacher: false }).exec();
  }
  if (a[0] != "default" || a[2] != "all" || a[3] != "all") {
    let toSearch = a[0] == "default" ? '' : a[0];
    let SearchLetter = a[2] == "all" ? '' : a[2].toLowerCase();
    let SearchGroup = a[3] == "all" ? '' : a[3];
    foundStudents = []
    const fuse = new Fuse(students, {
      includeScore: true,
      keys: ['name']
    });
    if (toSearch == "")
      students.forEach(student => {
        if ((student.gradeLetter == SearchLetter || SearchLetter == "") && (student.group == SearchGroup || SearchGroup == "")) {
          foundStudents.push(student);
        }
      });
    else
      fuse.search(toSearch).forEach(student => {
        if ((student.score < 0.5) && (student.item.gradeLetter == SearchLetter || SearchLetter == "") && (student.item.group == SearchGroup || SearchGroup == "")) {
          foundStudents.push(student.item);
        }
      });
  } else {
    foundStudents = students;
  }
  foundStudents.sort((a, b) => { return a.name > b.name });

  let onPage = config.onPage.students;
  let page = req.params.page;
  let pages = Math.ceil(foundStudents.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, foundStudents.length)} из ${foundStudents.length}`;

  res.render('students.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Students List",
    isTeacher: req.user.isTeacher,
    page,
    pageInfo,
    pages,
    onPage,
    search: req.params.search,
    students: foundStudents.slice((page - 1) * onPage, page * onPage),
    location: req.header('Referer')
  })
})

app.post('/students/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.GradeSelector +
    '&' + (req.body.gradeLetter || "all") +
    '&' + (req.body.Group || "all")
  let keys = Object.keys(req.body)
  let student;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].slice(0, 6) == "login:") {
      student = await User.findOne({ login: keys[i].slice(6) }).exec()
      if (student.group != req.body[keys[i]]) {
        student.group = req.body[keys[i]]
        await student.save()
      }
    }
  }
  res.redirect('/students/' + req.params.page.toString() + '/' + toSearch)
})

//---------------------------------------------------------------------------------
// Add News Page
app.get('/addnews', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let user = req.user;
  res.render('News/add.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Add News",
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  })
});

app.post('/addnews', checkAuthenticated, checkNletter, checkPermission, uploadImage.single('image'), async (req, res) => {
  let user = req.user;
  let body = req.body;
  let filename = "";
  if (req.file) filename = req.file.filename

  let new_news = await Adder.addNews(News, body.title, body.description, body.text, filename, user.name);
  load();
  res.redirect("/")
});

//---------------------------------------------------------------------------------
// Delete News
app.post('/deletenews/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  await News.findByIdAndDelete(req.params.id);
  let filename = news[news.findIndex(item => item._id == req.params.id)].imageName;
  filepath = path.join(__dirname, "./public/media/newsImages/" + filename)
  childProcess.exec('del /q \"' + filepath + '\"');
  load();
  res.redirect('/');
})

//---------------------------------------------------------------------------------
// Edit News Pages
app.get('/editnews/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  one_news = news.find(item => item._id == req.params.id)
  let user = req.user;
  res.render('News/edit.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Edit News",
    isTeacher: req.user.isTeacher,
    news: one_news,
    location: req.header('Referer')
  })
})

app.post('/editnews/:id', checkAuthenticated, checkNletter, checkPermission, uploadImage.single('image'), async (req, res) => {
  let body = req.body;
  let newsDB = await News.findById(req.params.id).exec()

  newsDB.title = body.title;
  newsDB.text = body.text;
  newsDB.description = body.description;
  if (req.file) {
    if (newsDB.imageName.length != 0)
      fs.rm(path.join(__dirname, "./public/media/newsImages/" + newsDB.imageName), (err) => console.info("Ошибка при удалении картинки новости"));
    newsDB.imageName = req.file.filename;
  }
  await newsDB.save();

  let idx = news.findIndex(item => item._id == req.params.id)
  news[idx] = newsDB;

  res.redirect('/');
})

//---------------------------------------------------------------------------------
// News Page
app.get("/news/:id", (req, res) => {
  let currentNew = news.find(item => item._id == req.params.id);

  if (currentNew) {
    let render = {
      login: '',
      name: '',
      title: currentNew.title,
      isTeacher: false,
      location: "/",
      news: currentNew
    };
    if (req.user) {
      render.login = req.user.login;
      render.name = req.user.name;
      render.isTeacher = req.user.isTeacher;
    }
    res.render('News/page.ejs', render);
  } else {
    res.redirect('/')
  }
});

//---------------------------------------------------------------------------------
// Add Tournament Page
app.get('/tournament/add', checkAuthenticated, checkPermission, async (req, res) => {
  let user = req.user;
  res.render('Tournament/Global/add.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Add Tournament",
    isTeacher: req.user.isTeacher,
    location: `/tournaments/${user.login}/1/default&all&all`
  })
})

app.post('/tournament/add', checkAuthenticated, checkPermission, async (req, res) => {
  let user = req.user;
  let body = req.body;
  let tasks = [];
  let mods = [user.login].concat(body.mods.split(' '));
  let frozeAfter = body.frozeAfter ? body.frozeAfter : body.whenEnds;

  let emtpy_tournament = await Tournament.findOne({ title: "" }).exec();
  if (emtpy_tournament) {
    emtpy_tournament.title = body.title;
    emtpy_tournament.description = body.description;
    emtpy_tournament.tasks = body.tasks;
    emtpy_tournament.author = user.name;
    emtpy_tournament.whenStarts = body.whenStarts.replace('T', ' ');
    emtpy_tournament.whenEnds = body.whenEnds.replace('T', ' ');
    emtpy_tournament.frozeAfter = frozeAfter.replace('T', ' ');
    emtpy_tournament.mods = mods;
    emtpy_tournament.allowRegAfterStart = body.allowRegAfterStart == "on";
    emtpy_tournament.allOrNothing = body.allOrNothing == "1";
    emtpy_tournament.penalty = body.penalty * 1000;
    emtpy_tournament.isBegan = false;
    emtpy_tournament.isEnded = false;
    emtpy_tournament.isFrozen = false;
    emtpy_tournament.results = [];
    emtpy_tournament.attempts = [];
    emtpy_tournament.frozenResults = [];
    emtpy_tournament.disqualificated = [];
    emtpy_tournament.messages = [];

    emtpy_tournament.markModified('messages');
    emtpy_tournament.markModified('disqualificated');
    emtpy_tournament.markModified('results');
    emtpy_tournament.markModified('attempts');
    emtpy_tournament.markModified('frozenResults');
    emtpy_tournament.markModified('mods');
    emtpy_tournament.markModified('tasks');
    emtpy_tournament.save();
  } else {
    await Adder.addTournament(Tournament, body.title, body.description,
      tasks, user.name, body.whenStarts.replace('T', ' '),
      body.whenEnds.replace('T', ' '), frozeAfter.replace('T', ' '), mods, body.allowRegAfterStart == "on",
      body.allOrNothing == "1", body.penalty * 1000);
  }

  res.redirect("/tournament/add")
})

//---------------------------------------------------------------------------------
// Tournaments List Page
app.get('/tournaments/:login/:page/:search', checkAuthenticated, async (req, res) => {

  let user;
  if (req.user.login == req.params.login || !req.user.isTeacher) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }
  let results = [];
  let foundTournaments = [];

  let a = req.params.search.split('&');
  let toSearch = a[0] == "default" ? '' : a[0].toUpperCase();
  let isBegan = a[1] == 'true';
  let isEnded = a[2] == 'true';

  let Tournaments = (await Tournament.find({}).exec()).slice(1).filter(item => item.title != "");

  const fuse = new Fuse(Tournaments, {
    includeScore: true,
    keys: ["title"]
  });

  if (toSearch == "")
    foundTournaments = Tournaments;
  else
    foundTournaments = fuse.search(toSearch).map(tournament => tournament.item)

  if (a[1] != 'all') {
    foundTournaments = foundTournaments.filter(item => (item.isBegan == isBegan) && (item.isEnded == isEnded));
  }

  //Sorting tournaments
  let obj = [];
  for (let i = 0; i < foundTournaments.length; i++) {
    obj.push([foundTournaments[i], results[i]]);
  }
  obj.sort(compareTournaments);
  for (let i = 0; i < foundTournaments.length; i++) {
    foundTournaments[i] = obj[i][0];
  }
  for (let i = 0; i < results.length; i++) {
    results[i] = obj[i][1];
  }

  foundTournaments.sort((a, b) => { return a._id < b._id });

  let onPage = config.onPage.tournaments;
  let page = req.params.page;
  let pages = Math.ceil(foundTournaments.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, foundTournaments.length)} из ${foundTournaments.length}`;
  let ids = foundTournaments.map(item => item.identificator).join("|");

  res.render('tournaments.ejs', {
    u_login: user.login,
    n_name: user.name,
    login: req.user.login,
    name: req.user.name,
    title: "Tournaments List",
    isTeacher: req.user.isTeacher,
    ids,
    page,
    pages,
    onPage,
    pageInfo,
    search: req.params.search,
    location: req.header('Referer')
  })
})

app.post('/tournaments/:login/:page/:search', checkAuthenticated, async (req, res) => {
  let toSearch = req.body.searcharea;
  let type = req.body.typeSelector.split('_');
  let isBegan = type[0];
  let isEnded = type[1];
  if (!toSearch) toSearch = "default";
  if (isEnded) {
    toSearch += '&' + isBegan + '&' + isEnded;
  } else {
    toSearch += '&all';
  }
  res.redirect('/tournaments/' + req.params.login + '/' + req.params.page.toString() + '/' + toSearch)
})


//---------------------------------------------------------------------------------
// Edit Tournament Page
app.get('/tournament/edit/:tour_id', checkAuthenticated, isModerator, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
  let user = req.user;
  res.render('Tournament/Global/edit.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Edit Tournament",
    isTeacher: req.user.isTeacher,
    tournament: tournament,
    location: '/tournament/page/' + req.user.login + '/' + req.params.tour_id
  })
})

app.post('/tournament/edit/:tour_id', checkAuthenticated, isModerator, async (req, res) => {
  let body = req.body;
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec()

  tournament.title = body.title;
  tournament.description = body.description;
  if (body.whenStarts)
    tournament.whenStarts = body.whenStarts.replace('T', ' ');
  tournament.whenEnds = body.whenEnds.replace('T', ' ');
  tournament.frozeAfter = body.frozeAfter.replace('T', ' ');
  tournament.allowRegAfterStart = body.allowRegAfterStart == "on";
  tournament.allOrNothing = body.allOrNothing == "1";
  tournament.penalty = body.penalty * 1000;
  tournament.mods = [req.user.login].concat(body.mods.split(' ')).filter(item => item != "");
  tournament.markModified('mods');
  await tournament.save();

  res.redirect(`/tournament/page/${req.user.login}/${req.params.tour_id}/`)
})

//---------------------------------------------------------------------------------
// Delete Tournament Page
app.post('/deletetournament/:tour_id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
  tournament.title = "";
  tournament.save();
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteTournament.js") + " " + req.params.tour_id)
  res.redirect('/tournaments/' + req.user.login + '/1/default&all&all');
})


//---------------------------------------------------------------------------------
//Register to tournament
app.get('/regTournament/:tour_id', checkAuthenticated, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec()
  if ((!tournament.isBegan || tournament.allowRegAfterStart) && !req.user.isTeacher) {
    let newRes = {
      login: req.user.login,
      sumscore: 0,
      sumtime: 0,
      tasks: []
    }

    for (let i = 0; i < tournament.tasks.length; i++) {
      newRes.tasks.push({
        score: 0,
        dtime: 0,//from start
        tries: 0
      })
    }


    tournament.results.push(newRes);
    tournament.markModified('results');
    await tournament.save();
  }
  res.redirect('/tournaments/' + req.user.login + '/1/default&all&all')
})


//---------------------------------------------------------------------------------
// Add Task to Tournament Page
app.get('/tournament/task/add/:tour_id', checkAuthenticated, isModerator, async (req, res) => {
  let user = req.user;
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec()
  res.render('Tournament/Task/add.ejs', {
    login: user.login,
    name: req.user.name,
    title: "Add Task",
    tournament: tournament,
    isTeacher: req.user.isTeacher,
    location: '/tournament/page/' + req.user.login + '/' + req.params.tour_id
  });
});

app.post('/tournament/task/add/:tour_id', checkAuthenticated, isModerator, uploadTests.single('file'), async (req, res) => {
  let body = req.body;


  let examples = [];
  let exI, exO;
  for (let i = 0; i < 5; i++) {
    eval("exI = body.exampleIn" + i)
    eval("exO = body.exampleOut" + i)
    if (exI == "" || exO == "") break;
    examples.push([exI.trim(), exO.trim()]);
  }

  let tests = [];
  if (req.file) {
    try {
      let filepath = path.join(__dirname, '/public/tests/' + req.file.filename)
      const zip = new StreamZip.async({ file: filepath });

      const entriesCount = await zip.entriesCount;

      for (let i = 0; i < entriesCount / 2; i++) {
        let inp = await zip.entryData("input" + i + ".txt");
        let out = await zip.entryData("output" + i + ".txt");
        tests.push([inp.toString('utf8').trim(), out.toString('utf8').trim()])
      }

      await zip.close();
      childProcess.exec('del /q \"' + filepath + '\"');

    } catch (err) {
      console.log(err)
    }
  } else {
    let tI, tO;
    for (let i = 0; i < 20; i++) {
      eval("tI = body.testIn" + i)
      eval("tO = body.testOut" + i)
      if (tI == "" || tO == "") break;
      tests.push([tI.trim(), tO.trim()]);
    }
  }
  await Adder.addTaskToTournament(Tournament, req.params.tour_id, body.title.trim(), body.statement.trim(), body.input.trim(), body.output.trim(), examples, tests);

  res.redirect('/tournament/task/add/' + req.params.tour_id);
});

//---------------------------------------------------------------------------------
// Delete Task from Tournament
app.post('/tournament/task/delete/:tour_id/:id', checkAuthenticated, isModerator, async (req, res) => {

  childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteTournamentTask.js") + " " +
    req.params.tour_id + " " + req.params.id)
  res.redirect('/tournament/page/' + req.user.login + '/' + req.params.tour_id);
});

//---------------------------------------------------------------------------------
// Tournament Task Page
app.get('/tournament/task/page/:tour_id/:id', checkAuthenticated, checkTournamentPermission, async (req, res) => {
  let tour_id = req.params.tour_id
  let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
  let ids = tournament.tasks.map(item => item.identificator).join("|");
  let whenEnds = tournament.whenEnds;
  let isBegan = tournament.isBegan;
  problem = tournament.tasks.find(item => item.identificator == req.params.id);
  if (!problem) {
    res.redirect('/tournament/page/' + req.user.login + '/' + req.params.tour_id);
  }
  let attempts = req.user.attempts;
  let prevCode = "";
  let language = "";
  for (let i = 0; i < attempts.length; i++) {
    if (attempts[i].taskID == req.params.id) {
      prevCode = attempts[i].programText;
      language = attempts[i].language;
      break;
    }
  }
  res.render('Tournament/Task/page.ejs', {
    login: req.user.login,
    ID: req.params.id,
    TUR_ID: req.params.tour_id,
    name: req.user.name,
    title: "Task " + req.params.id,
    isTeacher: req.user.isTeacher,
    ids,
    problem: problem,
    prevCode: prevCode,
    language: language,
    whenEnds: whenEnds,
    isBegan: isBegan,
    tournament,
    location: '/tournament/page/' + req.user.login + '/' + req.params.tour_id
  });
});

// Tournament Task Page listener
app.post('/tournament/task/page/:tour_id/:id', checkAuthenticated, checkTournamentPermission, uploadCode.single('file'), async (req, res) => {
  fs.stat(path.normalize('public/processes/' + req.user.login + '_' + req.params.id), async function (err) {
    let isInQueue = TestingQueue.findIndex(item => (item.id == req.params.id && item.login == req.user.login))
    if (!err || isInQueue != -1) {
      res.redirect('/tournament/task/page/' + req.params.tour_id + '/' + req.params.id);
    }
    else if (err.code === 'ENOENT') {

      let prevCode = ""
      let attempts = req.user.attempts;
      for (let i = 0; i < attempts.length; i++) {
        if (attempts[i].taskID == req.params.id) {
          prevCode = attempts[i].programText;
          result = attempts[i].result;
          break;
        }
      }
      let programText;
      let language = req.body.languageSelector;
      if (req.file) {
        try {
          let filepath = path.join(__dirname, '/public/codes/' + req.file.filename);
          programText = fs.readFileSync(filepath, "utf8");
          childProcess.exec('del /q \"' + filepath + '\"');

        } catch (err) {
          console.log(err)
        }

      } else {
        programText = req.body.code;
      }
      if (prevCode == "" || prevCode != programText || req.file) {

        language = req.body.languageSelector;

        let sendAt = Date.now().toString();

        let object = {
          login: req.user.login,
          id: req.params.id,
          programText,
          language,
          sendAt,
          command: 'node ' + path.join(__dirname, '/public/checker/checker3' + language + '.js') + ' ' +
            path.join(__dirname, '/public/processes/' + req.user.login + '_' + req.params.id) + " " +
            'program' + req.user.login + '_' + req.params.id + " " +
            req.params.id
        }
        pushToQueue(object);
      }
      res.redirect('/tournament/task/page/' + req.params.tour_id + '/' + req.params.id);
    }
  });
});


//---------------------------------------------------------------------------------
// Tournament Page
app.get('/tournament/page/:login/:id', checkAuthenticated, checkTournamentValidation, async (req, res) => {
  let user;
  if (req.user.login == req.params.login) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  let tournament = await Tournament.findOne({ identificator: req.params.id }).exec();
  if (!tournament || tournament.title == "") {
    res.redirect("/tournaments/" + req.params.login + "/1/default&all&all")
  } else {
    let tasks = tournament.tasks;
    let verdicts = [];
    let verdict;
    for (let i = 0; i < tournament.tasks.length; i++) {
      verdict = user.verdicts.find(item => item.taskID == tournament.tasks[i].identificator)
      if (!verdict) {
        verdict = "-"
      } else {
        verdict = verdict.result
      }
      verdicts.push(verdict)
    }
    let registered = false;
    if (!(tournament.mods.find(item => item == req.user.login) || tournament.isEnded || tournament.isBegan && tournament.results.find(item => item.login == req.params.login))) {
      tasks = [];
    }
    if (tournament.results.find(item => item.login == req.params.login)) {
      registered = true;
    }
    tasks = tasks.map(item => item.identificator).join('|');
    res.render('Tournament/Global/page.ejs', {
      ID: tournament.identificator,
      u_login: user.login,
      u_name: user.name,
      login: user.login,
      name: req.user.name,
      title: "Tournament",
      isTeacher: req.user.isTeacher,
      tournament: tournament,
      foundTasks: tasks,
      registered: registered,
      location: `/tournaments/${req.params.login}/1/default&all&all`
    });
  }
})

//---------------------------------------------------------------------------------
// Edit tournament task
app.get('/tournament/task/edit/:tour_id/:id', checkAuthenticated, isModerator, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
  let task = tournament.tasks.find(item => item.identificator == req.params.id);
  res.render('Tournament/Task/edit.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Edit Tournament Task",
    isTeacher: req.user.isTeacher,
    task: task,
    tour_id: req.params.tour_id,
    location: `/tournament/task/page/${req.params.tour_id}/${req.params.id}`
  })
});

app.post('/tournament/task/edit/:tour_id/:id', checkAuthenticated, isModerator, uploadTests.single('file'), async (req, res) => {
  let body = req.body;
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
  let problem = tournament.tasks.find(item => item.identificator == req.params.id);

  let examples = [];
  let exI, exO;
  for (let i = 0; i < 5; i++) {
    eval("exI = body.exampleIn" + i)
    eval("exO = body.exampleOut" + i)
    if (exI == "" || exO == "") break;
    examples.push([exI.trim(), exO.trim()]);
  }

  let tests = [];
  if (req.file) {
    try {
      let filepath = path.join(__dirname, '/public/tests/' + req.file.filename)
      const zip = new StreamZip.async({ file: filepath });

      const entriesCount = await zip.entriesCount;

      for (let i = 0; i < entriesCount / 2; i++) {
        let inp = await zip.entryData("input" + i + ".txt");
        let out = await zip.entryData("output" + i + ".txt");
        tests.push([inp.toString('utf8').trim(), out.toString('utf8').trim()])
      }

      await zip.close();
      childProcess.exec('del /q \"' + filepath + '\"');

    } catch (err) {
      console.log(err)
    }
  } else {
    let tI, tO;
    for (let i = 0; i < 20; i++) {
      eval("tI = body.testIn" + i)
      eval("tO = body.testOut" + i)
      if (tI == "" || tO == "") break;
      tests.push([tI.trim(), tO.trim()]);
    }
  }

  problem.title = body.title.trim();
  problem.statement = body.statement.trim();
  problem.input = body.input.trim();
  problem.output = body.output.trim();
  problem.examples = examples;
  problem.tests = tests;

  tournament.markModified('tasks');
  await tournament.save();

  res.redirect('/tournament/task/page/' + req.params.tour_id + '/' + req.params.id);
});

//---------------------------------------------------------------------------------
// Tournament results page
app.get('/tournament/results/:tour_id/', checkAuthenticated, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
  let baza;
  if (tournament.isFrozen && !tournament.isEnded && !tournament.mods.includes(req.user.login)) {
    baza = tournament.frozenResults;
  } else {
    baza = tournament.results;
  }
  let results = [];
  if (tournament) {
    for (let i = 0; i < baza.length; i++) {
      let user = await User.findOne({ login: baza[i].login })
      if (user)
        results.push([baza[i], user.isTeacher]);
    }
    res.render('Tournament/Global/results.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Tournament Results",
      isTeacher: req.user.isTeacher,
      ID: req.params.tour_id,
      tournament: tournament,
      results: results,
      isModerator: tournament.mods.includes(req.user.login),
      location: `/tournament/page/${req.user.login}/${req.params.tour_id}`
    });
  } else {
    res.redirect('/');
  }
});

//---------------------------------------------------------------------------------
// Tournament attempts page
app.get('/tournament/attempts/:tour_id/:page/:toSearch', checkAuthenticated, isModerator, async (req, res) => {
  let a = req.params.toSearch.split('&');
  let loginSearch = a[0] == "all" ? "" : a[0].toUpperCase();
  let taskSearch = a[1] == "all" ? "" : a[1].toUpperCase();
  let success = a[2] != "all";
  let needTasks = a[1] != "all";
  let needLogin = a[0] != "all";
  let bynew = a[3] == "true";

  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
  let attempts = tournament.attempts;

  //search
  attempts = attempts.filter(item => (!success || item.score == 100) && (!needTasks || parseInt(item.TaskID.split("_")[1]) + 1 == parseInt(taskSearch)) && (!needLogin || item.login == loginSearch))

  if (bynew) { // sorry for reverse logic :)
    attempts.sort((a, b) => {
      if (parseInt(a.AttemptDate) > parseInt(b.AttemptDate)) {
        return -1;
      }
      else {
        return 1;
      }
    });
  }

  let tasks = attempts.map(attempt => tournament.tasks.find(task => task.identificator == attempt.TaskID));

  let onPage = config.onPage.attempts;
  let page = req.params.page;
  let pages = Math.ceil(attempts.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, attempts.length)} из ${attempts.length}`;

  res.render('Tournament/Global/attempts.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: tournament.title,
    isTeacher: req.user.isTeacher,
    tourID: tournament.identificator,
    attempts,
    tasks,
    page: req.params.page,
    onPage,
    pageInfo,
    pages,
    search: req.params.toSearch,
    location: `/tournament/page/${req.user.login}/${req.params.tour_id}`
  });
});
app.post('/tournament/attempts/:tour_id/:page/:toSearch', checkAuthenticated, isModerator, async (req, res) => {
  let toSearch = req.body.loginSearch.trim() == "" ? "all" : req.body.loginSearch.trim();
  toSearch += '&' + (req.body.taskSearch.trim() == "" ? "all" : req.body.taskSearch.trim());
  toSearch += '&' + (req.body.selector);
  toSearch += '&' + (req.body.selector_new);
  res.redirect(`/tournament/attempts/${req.params.tour_id}/${req.params.page}/${toSearch}`);
});

//---------------------------------------------------------------------------------
// Tournament disqualification
app.post("/tournament/disqualAttempt/:tour_id/:AttemptDate", checkAuthenticated, isModerator, async (req, res) => {
  let AttemptDate = req.params.AttemptDate;
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
  let idx = tournament.attempts.findIndex(item => item.AttemptDate == AttemptDate);
  let login = tournament.attempts[idx].login;
  let score = tournament.attempts[idx].score;
  let TaskID = tournament.attempts[idx].TaskID.split('_')[1];
  tournament.attempts.splice(idx, 1);
  let resUserIndx = tournament.results.findIndex(item => item.login == login);
  if (score == tournament.results[resUserIndx].tasks[TaskID].score) {
    let mx = -1;
    let mx_ind;
    for (let i = 0; i < tournament.attempts.length; i++) {
      if (tournament.attempts[i].login == login && tournament.attempts[i].TaskID.split('_')[1] == TaskID && mx < tournament.attempts[i].score) {
        mx = tournament.attempts[i].score;
        mx_ind = i;
      }
    }
    if (mx != -1) {
      tournament.results[resUserIndx].sumscore += tournament.attempts[mx_ind].score - score;
      tournament.results[resUserIndx].sumtime += (tournament.attempts[mx_ind].AttemptDate - Date.parse(tournament.whenStarts)) - tournament.results[resUserIndx].tasks[TaskID].dtime;

      tournament.results[resUserIndx].tasks[TaskID].dtime = (tournament.attempts[mx_ind].AttemptDate - Date.parse(tournament.whenStarts));
      tournament.results[resUserIndx].tasks[TaskID].score = tournament.attempts[mx_ind].score;
    } else {
      tournament.results[resUserIndx].sumscore -= score;
      tournament.results[resUserIndx].sumtime -= tournament.results[resUserIndx].tasks[TaskID].dtime;

      tournament.results[resUserIndx].tasks[TaskID].dtime = 0;
      tournament.results[resUserIndx].tasks[TaskID].score = 0;
    }
  }
  tournament.markModified("attempts");
  tournament.markModified("results");

  await tournament.save()
  res.redirect(`/tournament/attempts/${req.params.tour_id}/1/all&all&all&true`)
});

app.post("/tournament/disqualUser/:tour_id/:login", checkAuthenticated, isModerator, async (req, res) => {
  let login = req.params.login;
  let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
  tournament.results.splice(tournament.results.findIndex(item => item.login == login), 1);
  tournament.frozenResults.splice(tournament.frozenResults.findIndex(item => item.login == login), 1);
  tournament.attempts = tournament.attempts.filter(item => item.login != login);
  tournament.disqualificated.push(req.params.login);
  tournament.markModified("results");
  tournament.markModified("disqualificated");
  tournament.markModified("frozenResults");
  tournament.markModified("attempts");
  await tournament.save()

  res.redirect(`/tournament/attempts/${req.params.tour_id}/1/all&all&all&true`)
});

//---------------------------------------------------------------------------------
// About Page
app.get('/about', checkAuthenticated, async (req, res) => {
  res.render('about.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "About",
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  });
});

//---------------------------------------------------------------------------------
// Edit Group
app.post('/editgroup/:login/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let student = await User.findOne({ login: req.params.login })
  if (req.body.groupEditor) {
    student.group = req.body.groupEditor;
    await student.save()
  }
  res.redirect('/students' + '/' + req.params.page + '/' + req.params.search);
})

//---------------------------------------------------------------------------------
// Registration Page
app.get("/registration", async (req, res) => {
  let logins = [];
  let users = await User.find();
  for (let i = 0; i < users.length; i++) {
    let login = users[i].login;
    if (login.length >= 2 && login[0] == "n" && login[1] == "_") {
      login = login.slice(2);
    }
    logins.push(login);
  }
  res.render('Account/registration.ejs', {
    login: "",
    name: "",
    title: "Registration Page",
    isTeacher: false,
    logins,
    msg: "",
    location: req.header('Referer')
  });
});

app.post("/registration", async (req, res) => {
  let new_user = {
    login: "n-" + req.body.login,
    password: req.body.password,
    name: req.body.name,
    isTeacher: false,

    grade: 0,
    gradeLetter: "N",
    group: req.body.email
  };
  let user = await User.findOne({ login: new_user.login }).exec();
  if (user) {
    let logins = [];
    let users = await User.find();
    for (let i = 0; i < users.length; i++) {
      let login = users[i].login;
      if (login.length >= 2 && login[0] == "n" && login[1] == "_") {
        login = login.slice(2);
      }
      logins.push(login);
    }
    res.render('registration.ejs', {
      login: "",
      name: "",
      title: "Registration Page",
      msg: "Такой логин уже занят!",
      logins,
      isTeacher: false,
      location: undefined
    });
    return;
  }
  new_user.password = bcrypt.hashSync(new_user.password, 10);
  await User.insertMany([new_user]);
  res.redirect("/");
});

//---------------------------------------------------------------------------------
// Edit Account Page
app.get("/EditAccount", checkAuthenticated, async (req, res) => {
  let rendered = {
    login: req.user.login,
    name: req.user.name,
    title: "Edit Account Page",
    isTeacher: req.user.isTeacher,
    user: req.user,
    msg: "",
    location: req.header('Referer')
  };

  res.render('Accout/edit.ejs', rendered)
});

app.post("/EditAccount", checkAuthenticated, async (req, res) => {
  let user = await User.findOne({ login: req.user.login });
  if (req.body.password.length < 5 && req.body.password.trim().length != 0) {
    return res.render('Account/edit.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Edit Account Page",
      isTeacher: req.user.isTeacher,
      user: req.user,
      msg: "Пароль должен содержать как минимум 5 символов!",
      location: undefined
    });
  }
  if (req.user.login.slice(0, 2) == "n-") {
    user.name = req.body.name;
    user.group = req.body.email;
  }
  if (req.body.password.trim().length != 0) {
    user.password = bcrypt.hashSync(req.body.password, 10);
  }
  user.markModified("name");
  user.markModified("group");
  user.markModified("password");
  await user.save();
  res.redirect("/");
});

//---------------------------------------------------------------------------------
// Report Page
app.get("/report", checkAuthenticated, async (req, res) => {
  let rendered = {
    login: req.user.login,
    name: req.user.name,
    title: "Report Page",
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  };

  res.render('Account/report.ejs', rendered)
});

app.post("/report", checkAuthenticated, async (req, res) => {
  if (req.body.report) {
    let sign = "\n" + req.user.name + "\n" + req.user.login
    let info = transporter.sendMail({
      from: '"ACCEPT report collector" <accept.report@gmail.com>', // sender address
      to: "pro100pro10010@gmail.com", // list of receivers
      subject: req.body.type_selector, // Subject line
      text: req.body.report + sign // plain text body
    });
  }
  res.redirect("/report");
});

//---------------------------------------------------------------------------------
// News List Page
app.get("/newslist/:page", async (req, res) => {

  newslist = await News.find({}).exec();
  newslist.reverse();

  let onPage = config.onPage.newsList;
  let page = req.params.page;
  let pages = Math.ceil(newslist.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, newslist.length)} из ${newslist.length}`;

  let rendered = {
    login: (req.user) ? req.user.login : "",
    name: (req.user) ? req.user.name : "",
    title: "News List Page",
    isTeacher: (req.user) ? req.user.isTeacher : false,
    page,
    pages,
    onPage,
    pageInfo,
    news: newslist.slice((page - 1) * onPage, page * onPage),
    location: req.header('Referer')
  };

  res.render('News/list.ejs', rendered)
});


//---------------------------------------------------------------------------------
// Tried Page
app.get('/tried/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
  let user;
  if (req.user.login == req.params.login) {
    user = req.user;
  } else {
    user = await User.findOne({ login: req.params.login }).exec();
  }

  if (user) {
    let tasks = await Task.find({}).exec();
    let tournaments = await Tournament.find({}).exec();
    let verdicts = user.verdicts;
    let foundTasks = [];
    let foundVerdicts = []

    let a = req.params.search.split('&');
    let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    let types = a[1];
    let tourTask = [];
    let task;

    tournaments.forEach(tournament => tournament.tasks.forEach(task => tourTask.push(task)));
    for (let i = 0; i < verdicts.length; i++) {
      if (verdicts[i].taskID.split('_')[0] != '0')
        task = tourTask.find(item => item.identificator == verdicts[i].taskID);
      else
        task = tasks.find(item => item.identificator == verdicts[i].taskID);
      if (task) {
        foundTasks.push(task);
        foundVerdicts.push(verdicts[i]);
      }
    }
    req.user.verdicts = foundVerdicts;
    req.user.markModified("verdicts");
    await req.user.save();

    const fuse = new Fuse(foundTasks, {
      includeScore: true,
      keys: ["title"]
    });
    tasks = [];
    verdicts = [];
    if (!(toSearch == ""))
      fuse.search(toSearch).forEach(task => {
        if (task.score < 0.5) {
          tasks.push(task.item);
          verdicts.push(foundVerdicts.find(verdict => verdict.taskID == task.item.identificator));
        }
      });
    if (verdicts.length > 0) {
      foundTasks = tasks;
      foundVerdicts = verdicts;
    }
    verdicts = [];
    tasks = [];
    for (let i = 0; i < foundVerdicts.length; i++) {
      if (types == "all" || foundVerdicts[i].result == "OK") {
        verdicts.push(foundVerdicts[i]);
        tasks.push(foundTasks[i]);
      }
    }

    let onPage = config.onPage.attempts;
    let page = req.params.page;
    let pages = Math.ceil(verdicts.length / onPage);
    let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, verdicts.length)} из ${verdicts.length}`;
    verdicts = verdicts.slice((page - 1) * onPage, min(page * onPage, verdicts.length));
    tasks = tasks.slice((page - 1) * onPage, min(page * onPage, tasks.length));


    res.render('Account/triedTasks.ejs', {
      login: req.user.login,
      u_login: user.login,
      name: req.user.name,
      title: "Tried Tasks",
      pageInfo,
      page,
      pages,
      verdicts,
      tasks,
      isTeacher: req.user.isTeacher,
      search: req.params.search,
      n_name: user.name,
      user: user,
      location: req.header('Referer')
    })

  } else {
    res.redirect('/tried/' + req.user.login + '/1/default&all')
  }
});

app.post('/tried/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.selector;
  res.redirect('/tried/' + req.params.login.toString() + '/' + req.params.page.toString() + '/' + toSearch)
});


//---------------------------------------------------------------------------------
// Rating Page
app.get('/rating/:page', checkAuthenticated, async (req, res) => {

  let objs = [];
  let user, count, obj;
  let users = await User.find({ isTeacher: false });
  for (let i = 0; i < users.length; i++) {
    user = users[i];
    obj = {
      login: user.login,
      name: user.name,
      verdict: 0
    };
    count = 0;
    for (let j = 0; j < user.verdicts.length; j++) {
      if (user.verdicts[j].result == "OK") {
        count++;
      }
    }
    obj.verdict = count;
    objs.push(obj);
  }
  objs.sort((a, b) => { return b.verdict - a.verdict; });

  let onPage = config.onPage.students;
  let page = req.params.page;
  let pages = Math.ceil(objs.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, objs.length)} из ${objs.length}`;
  objs = objs.slice((page - 1) * onPage, min(page * onPage, objs.length));


  res.render('rating.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Rating",
    pageInfo,
    page,
    pages,
    objs,
    onPage,
    isTeacher: req.user.isTeacher,
    user: user,
    location: req.header('Referer')
  });
});

//---------------------------------------------------------------------------------
// Quizzes page
app.get('/quizzes/:login/:page/:search', checkAuthenticated, async (req, res) => {
  let toSearch = req.params.search.toLowerCase() == "default" ? "" : req.params.search.toLowerCase();
  let u_login = req.user.login;
  let u_name = req.user.name;
  let user = req.user;
  if (req.user.isTeacher) {
    user = await User.findOne({ login: req.params.login });
    if (user) {
      u_login = user.login;
      u_name = user.name;
    }
  }

  let quizzes;
  if (user.isTeacher) {
    quizzes = await Quiz.find().exec();
  } else {
    quizzes = await Quiz.find({ template: false }).exec();
  }

  const fuse = new Fuse(quizzes, {
    includeScore: true,
    keys: ["title"]
  });

  usedQuizzes = [];
  if (toSearch != "") {
    fuse.search(toSearch).forEach(quiz => {
      if (quiz.score < 0.5) {
        usedQuizzes.push(quiz.item);
      }
    });
    quizzes = usedQuizzes;
  }

  let onPage = config.onPage.lessons;
  let page = req.params.page;
  let pages = Math.ceil(quizzes.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, quizzes.length)} из ${quizzes.length}`;
  quizzes = quizzes.slice((page - 1) * onPage, min(page * onPage, quizzes.length));


  res.render('quizzes.ejs', {
    login: req.user.login,
    name: req.user.name,
    u_login,
    u_name,
    title: "Rating",
    pageInfo,
    page,
    pages,
    quizzes,
    onPage,
    isTeacher: req.user.isTeacher,
    user: user,
    location: req.header('Referer')
  });
});

app.post('/quizzes/:login/:page/:search', checkAuthenticated, async (req, res) => {
  let toSearch = req.body.searcharea ? req.body.searcharea : "default";
  res.redirect(`/quizzes/${req.params.login}/${req.params.page}/${toSearch}`);
});

//---------------------------------------------------------------------------------
// Quiz page
app.get("/quiz/page/:login/:id", checkAuthenticated, checkGrade, async (req, res) => {
  let quiz = await Quiz.findOne({ identificator: req.params.id }).exec();

  res.render('Quiz/Page.ejs', {
    title: "Quiz page",
    login: req.user.login,
    name: req.user.name,
    u_login: req.params.login,
    quiz,
    user: req.user,
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  });
});

//---------------------------------------------------------------------------------
// Add quiz page
app.get("/quiz/add", checkAuthenticated, checkPermission, async (req, res) => {
  res.render('Quiz/Add.ejs', {
    title: "Add quiz",
    login: req.user.login,
    name: req.user.name,
    user: req.user,
    isTeacher: req.user.isTeacher,
    location: `/quizzes/${req.user.login}/1/default`
  });
});

app.post("/quiz/add", checkAuthenticated, checkPermission, async (req, res) => {
  Adder.AddQuizTemplate(Quiz, req.body.title, req.body.description, req.body.duration, req.user.name);

  res.redirect("/quiz/add");
});

//---------------------------------------------------------------------------------
// Add quiz page
app.get("/quiz/edit/:id", checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await Quiz.findOne({ identificator: req.params.id }).exec();
  quiz = {
    title: quiz.title,
    description: quiz.description,
    duration: quiz.duration,
    identificator: quiz.identificator
  }
  res.render('Quiz/Edit.ejs', {
    title: "Add quiz",
    login: req.user.login,
    name: req.user.name,
    user: req.user,
    quiz,
    isTeacher: req.user.isTeacher,
    location: `/quiz/page/${req.user.login}/${req.params.id}`
  });
});

app.post("/quiz/edit/:id", checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await Quiz.findOne({ identificator:req.params.id }).exec();
  quiz.description = req.body.description;
  quiz.title = req.body.title;
  quiz.duration = req.body.duration;
  await quiz.save();
  res.redirect(`/quiz/page/${req.user.login}/${req.params.id}`);
});

//---------------------------------------------------------------------------------
// Delete Quiz page
app.post("/quiz/delete/:id", checkAuthenticated, checkPermission, async (req, res) => {
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteQuiz.js") + " " + req.params.id)

  res.redirect(`/quizzes/${req.user.login}/1/default`);
});

//---------------------------------------------------------------------------------
// Add start page
app.post("/quiz/start/:id", checkAuthenticated, checkPermission, async (req, res) => {
  Adder.AddQuiz(Quiz, req.body.grade, req.user.name, req.params.id);

  res.redirect(`/quizzes/${req.user.login}/1/default`);
});



// API
//------------------------------------------------------------------------------------------------API
//---------------------------------------------------------------------------------
// Get task results
app.get("/api/task/get/testresults/:id", checkAuthenticated, async (req, res) => {
  let results = {
    result: [],
    status: "",
    code: ""
  }
  let isInQueue = TestingQueue.findIndex(item => (item.id == req.params.id && item.login == req.user.login));
  try {
    fs.statSync(path.join(__dirname, '/public/processes/' + req.user.login + '_' + req.params.id));
    results.result = [["", "Testing...", "er"]];
    results.status = "testing";
  } catch (err) {
    if (isInQueue != -1) {
      results.result = [["", "In Testing Queue(" + (isInQueue + 1).toString() + ")..", "er"]];
      results.status = "testing";
    } else {
      let attempt = req.user.attempts.find(item => item.taskID == req.params.id);
      if (attempt) {
        results.result = attempt.result;
        if (attempt.result.find(item => item[2] == "er") != null)
          results.status = "error";
        else
          results.status = "success";
        results.code = attempt.programText;
      }
    }
  }
  res.json(results);
});


//---------------------------------------------------------------------------------
// Get task Verdicts
app.get("/api/task/get/testverdicts/:login/:ids", checkAuthenticated, async (req, res) => {
  let ids = req.params.ids.split("|");
  let tasks = [];
  let task, tournament;
  let user = await User.findOne({ login: req.params.login });
  // if (!user || !req.user.isTeacher)
  //   user = req.user;
  for (let i = 0; i < ids.length; i++) {
    if (ids[i].split('_')[0] == '0') {
      task = await Task.findOne({ identificator: ids[i] }).exec();
    } else {
      tournament = await Tournament.findOne({ identificator: parseInt(ids[i].split('_')[0]) }).exec();
      task = tournament.tasks.find(item => item.identificator == ids[i]);
    }
    tasks.push(task);
  }

  let verdict, isInQueue;
  let verdicts = [];
  let success = [];
  for (let i = 0; i < ids.length; i++) {
    id = ids[i];
    verdict = user.verdicts.find(item => item.taskID == id)
    if (verdict) {
      verdict = verdict.result
    } else {
      verdict = "-"
    }
    isInQueue = TestingQueue.findIndex(item => (item.id == id && item.login == user.login));
    try {
      fs.statSync(path.join(__dirname, '/public/processes/' + user.login + '_' + id));
      success.push("testing");
    } catch (err) {
      if (isInQueue != -1) {
        success.push("testing");
      } else {
        if (verdict == "-") {
          success.push("nottested");
        } else if (verdict == "OK") {
          success.push("success");
        } else {
          success.push("error");
        }
      }
    }
    verdicts.push(verdict);
  }

  res.json({
    verdicts,
    tasks,
    success
  });
});

//---------------------------------------------------------------------------------
// Get lessons + Tournaments verdicts
app.get("/api/cringe/get/verdicts/:ids/:flag", checkAuthenticated, async (req, res) => {
  let ids = req.params.ids.split("|");
  let flag = req.params.flag;
  let objects = [];
  let verdicts = [];
  for (let i = 0; i < ids.length; i++) {
    if (flag != "lessons")
      objects.push(Tournament.findOne({ identificator: parseInt(ids[i]) }))
    else
      objects.push(Lesson.findOne({ identificator: ids[i] }).exec());
  }
  objects = await Promise.all(objects);

  let solved, verdict, tasks;
  objects.forEach(object => {
    tasks = object.tasks
    if (flag != "lessons")
      tasks = tasks.map(item => item.identificator)
    solved = 0;
    for (let i = 0; i < tasks.length; i++) {
      verdict = req.user.verdicts.find(item => item.taskID == tasks[i]);
      if (verdict && verdict.result == "OK") {
        solved += 1;
      }
    }
    verdicts.push(`${solved}/${tasks.length}`);
  })

  res.json({
    verdicts,
    objects
  });
});

//---------------------------------------------------------------------------------
// Get attempt results
app.get("/api/attempts/get/verdicts/:login/:page/:search", checkAuthenticated, async (req, res) => {
  let user = await User.findOne({ login: req.params.login }).exec();
  if (!user || !req.user.isTeacher)
    user = req.user;
  let tasks = await Task.find({}).exec();
  let tournaments = await Tournament.find({}).exec();
  let page = req.params.page;
  let a = req.params.search.split('&amp;');
  let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
  let types = a[1];
  let attempts = user.attempts;
  let onPage = config.onPage.attempts;
  let foundAttempts = [];
  let foundTasks = [];
  let tourTask = [];

  tournaments.forEach(tournament => tournament.tasks.forEach(task => tourTask.push(task)));
  for (let i = 0; i < attempts.length; i++) {
    verylongresult = getVerdict(attempts[i].result);
    if ((types == 'all') || (verylongresult == 'OK')) {
      if (attempts[i].taskID.split('_')[0] != '0')
        task = tourTask.find(item => item.identificator == attempts[i].taskID);
      else
        task = tasks.find(item => item.identificator == attempts[i].taskID);
      if (task && task.title.slice(0, toSearch.length).toUpperCase() == toSearch) {
        foundAttempts.push(attempts[i]);
        foundTasks.push(task);
      }
    }
  }
  res.json({
    attempts: foundAttempts.slice((page - 1) * onPage, min(foundAttempts.length, page * onPage)),
    tasks: foundTasks.slice((page - 1) * onPage, min(foundTasks.length, page * onPage))
  });
});

//---------------------------------------------------------------------------------
// Get lesson result verdicts
app.get("/api/lessons/get/verdicts/:id/:logins", checkAuthenticated, async (req, res) => {
  if (!req.user.isTeacher)
    return res.json({});
  let logins = req.params.logins.split("|");
  let tasks = (await Lesson.findOne({ identificator: req.params.id }).exec()).tasks;
  let users = [];
  let verdicts = [];
  let results = [];
  for (let i = 0; i < logins.length; i++) {
    users.push(User.findOne({ login: logins[i] }).exec());
  }
  users = await Promise.all(users);

  for (let i = 0; i < users.length; i++) {
    verdicts = users[i].verdicts;
    solved = 0;
    for (let i = 0; i < tasks.length; i++) {
      verdict = verdicts.find(item => item.taskID == tasks[i]);
      if (verdict && verdict.result == "OK") {
        solved += 1;
      }
    }
    results.push(`${solved}/${tasks.length}`);
  }
  res.json({
    users,
    results
  });
});

//---------------------------------------------------------------------------------
// Get tournament results
app.get("/api/tournament/get/results/:id", checkAuthenticated, async (req, res) => {
  let id = req.params.id;
  let tournament = await Tournament.findOne({ identificator: id }).exec();
  let results = tournament.results
  if (tournament.isFrozen && !tournament.isEnded)
    results = tournament.frozenResults;
  res.json(results);
});

//---------------------------------------------------------------------------------
// Get tournament attempts results
app.get("/api/tournament/get/attempts/:id/:page/:search", checkAuthenticated, async (req, res) => {
  let tournament = await Tournament.findOne({ identificator: req.params.id }).exec();
  let a = req.params.search.split('&amp;');
  let login = a[0].toLowerCase();
  let taskID = a[1];
  let types = a[2].toLowerCase();
  let toReverse = a[3] == 'true';
  let attempts1 = tournament.attempts.filter(item => (taskID == "all" || parseInt(item.TaskID.split("_")[1]) + 1 == parseInt(taskID))
    && (types == "all" || item.score == 100));
  let attempts = attempts1.filter(item => (login == "all" || item.login.toLowerCase() == login || item.login.toLowerCase() == "n-" + login));
  if (attempts.length == 0)
    attempts = attempts1.filter(item => (login == "all" || item.login.toLowerCase().slice(0, login.length) == login || item.login.toLowerCase().slice(0, login.length + 2) == "n-" + login));
  if (toReverse)
    attempts = attempts.reverse();

  let onPage = configs.onPage.attempts;
  attempts = attempts.slice((req.params.page - 1) * onPage, max(req.params.page * onPage, attempts.length));
  res.json({
    attempts
  });
});

//---------------------------------------------------------------------------------
// ??? toDo
app.get('/egg1', checkAuthenticated, checkNotPermission, async (req, res) => {
  res.sendFile(__dirname + '/views/Random/20122020.html')
})
app.get('/MazeByMalveetha&Dsomni', checkAuthenticated, checkNotPermission, async (req, res) => {
  res.sendFile(__dirname + '/views/Random/21122020.html')
})
app.get('/emojiegg', checkAuthenticated, checkNotPermission, async (req, res) => {
  res.sendFile(__dirname + '/views/Random/19012021.html')
})
app.get('/patrikegg', checkAuthenticated, checkNotPermission, async (req, res) => {
  res.sendFile(__dirname + '/views/Random/20012021.html')
})
app.get('/beee', checkAuthenticated, checkNotPermission, async (req, res) => {
  res.sendFile(__dirname + '/views/Random/25012021.html')
})
//---------------------------------------------------------------------------------
// Log Out
app.delete('/logout', (req, res) => {
  req.logOut()
  res.redirect('/')
})

//---------------------------------------------------------------------------------
// Redirect from empty pages
app.get('*', (req, res) => {
  res.redirect('/');
})

//---------------------------------------------------------------------------------
// Functions

function checkNletter(req, res, next) {
  if (req.user.isTeacher || req.user.login.slice(0, 2) != "n-") {
    return next();
  }
  res.redirect('/');
}

async function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/')
}
function checkPermission(req, res, next) {
  if (req.user && req.user.isTeacher) {
    return next()
  }
  res.redirect('/')
}
function checkNotPermission(req, res, next) {
  if (req.user && req.user.isTeacher) {
    res.redirect('/')
  } else {
    return next()
  }
}
function checkValidation(req, res, next) {
  if (req.user.isTeacher || (req.user.login == req.params.login)) {
    return next()
  }
  res.redirect('/account/' + req.user.login + '/1/default&all')
}

function checkTournamentValidation(req, res, next) {
  if (req.user.isTeacher || (req.user.login == req.params.login)) {
    return next()
  }
  res.redirect('/tournaments/' + req.user.login + '/1/default&all')
}

function checkGrade(req, res, next) {
  if (req.user.isTeacher)
    return next()
  Quiz.findOne({ identificator: req.params.id }).then(quiz => {
    if ((req.user.grade + req.user.gradeLetter).toLowerCase() == quiz.grade.toLowerCase())
      return next()
    return res.redirect("/");
  }).catch(err => res.redirect("/"));
}

async function checkTournamentPermission(req, res, next) {
  let tour_id = req.params.tour_id;
  let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
  let isBegan = tournament.isBegan;

  if (tournament.mods.find(item => item == req.user.login) || tournament.isEnded || (isBegan && tournament.results.find(item => item.login == req.user.login))) {
    return next();
  }
  res.redirect('/tournament/page/' + req.user.login + '/' + tour_id);
}

async function isModerator(req, res, next) {
  let tour_id = req.params.tour_id;
  let login = req.user.login;
  let tournament = await Tournament.findOne({ identificator: tour_id }).exec();

  if (tournament.mods.find(item => item == login)) {
    return next();
  }
  res.redirect('/tournament/page/' + req.user.login + '/' + tour_id);
}

async function isLessonAvailable(req, res, next) {
  lesson = await Lesson.findOne({ identificator: req.params.id }).exec();
  if (req.user.isTeacher || (req.user.grade == lesson.grade)) {
    return next()
  }
  res.redirect('/lessons/' + req.user.login + '/1/default&all')
}

let max = (a, b) => { if (a > b) return a; return b };
let min = (a, b) => { return a + b - max(a, b) }

function getVerdict(results) {
  for (let i = 0; i < results.length; i++) {
    if (results[i][1] != "OK") {
      return results[i][1].split(" ").slice(0, 2).map(item => item[0].toUpperCase()).join("");
    }
  }
  if (results.length > 0)
    return "OK";
  return 'err';
}

function getScore(results) {
  return Math.ceil(results.filter(item => item[2] == "ok").length / results.length * 100)
}

function compareTournaments(a, b) {
  let ta = a[0];
  let tb = b[0];
  let a_now = !ta.isEnded && ta.isBegan;
  let a_wait = !ta.isBegan;
  let a_sDate = Date.parse(ta.whenStarts);
  let a_fDate = Date.parse(ta.whenEnds);
  let b_now = !tb.isEnded && tb.isBegan;
  let b_wait = !tb.isBegan
  let b_sDate = Date.parse(tb.whenStarts);
  let b_fDate = Date.parse(tb.whenEnds);

  if (a_now && b_now)
    return a_fDate - b_fDate;
  if (a_now && !b_now)
    return -1;
  if (!a_now && b_now)
    return 1;

  if (a_wait && b_wait)
    return a_sDate - b_sDate;
  if (a_wait && !b_wait)
    return -1;
  if (!a_wait && b_wait)
    return 1;
  return b_fDate - a_fDate;

}

//---------------------------------------------------------------------------------
// Tournaments timer checker start
setInterval(() => {
  childProcess.exec('node ' + path.join(__dirname, '/public/scripts/Tchecker.js'));
}, 1000 * 60 * 10)

//---------------------------------------------------------------------------------
// Tasks auto results checker
setInterval(() => {
  childProcess.exec('node ' + path.join(__dirname, '/public/scripts/TaskAutoChecker.js'));
}, 1000 * 60 * 10)

//---------------------------------------------------------------------------------
// Queue Manager
setInterval(async () => {
  let processesPath = path.join(__dirname, "/public/processes");
  let files = await fs.readdirSync(processesPath);
  if (files.length >= configs.maxThreadsTasks) {
    return;
  }
  for (let i = 0; i < min(configs.maxThreadsTasks - files.length, TestingQueue.length); i++) {
    popQueue()
  }
}, 2500)

//---------------------------------------------------------------------------------
// Starting Server
let port = config.port;
let server = app.listen(port); // port
console.log("Server started at port " + port);

//---------------------------------------------------------------------------------
// socket setup
let io = socketIo(server);
let tour;
io.on("connection", (socket) => {
  socket.on('new user', async (obj) => {
    tour = await Tournament.findOne({ identificator: obj.id }).exec();
    tour.messages.forEach(item => socket.emit("chat message", item));
  })
  socket.on("chat message", async (obj) => {
    io.emit('chat message', obj.data);
    tour = await Tournament.findOne({ identificator: obj.id }).exec();
    tour.messages.push(obj.data);
    tour.save()
  })
});