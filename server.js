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
const app = express();
//---------------------------------------------------------------------------------
// MongoDB connecting
let connectionString;
if(config.mongodbConfigs.User.Username!="" && config.mongodbConfigs.User.Password!=""){
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName;
}else{
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
    console.log("Error while connecting to DB: "+ err);
});

mongoose.set('useCreateIndex', true);

const User = require('./config/models/User');
const Task = require('./config/models/Task');
const News = require('./config/models/News');
const Lesson = require('./config/models/Lesson');
const Tournament = require('./config/models/Tournament');

//---------------------------------------------------------------------------------

const initializePassport = require('./config/passport');
const { log, Console } = require('console');
initializePassport(
    passport,
    User
);

//---------------------------------------------------------------------------------
// Settings
app.set('view-engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use('/public',express.static('public')); //where search for static files

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

//---------------------------------------------------------------------------------
// Loading from DB
let news;
async function load(){
    news = await News.find({}).exec();
}
load();

//---------------------------------------------------------------------------------
// Checking tournaments
childProcess.exec('node ' + path.join(__dirname, '/public/scripts/Tchecker.js'));

//---------------------------------------------------------------------------------
// Main Page
app.get('/', (req, res) =>  {
    if(req.user){
        res.render('main.ejs',{
            login: req.user.login,
            name : req.user.name,
            title: "Main Page",
            isTeacher: req.user.isTeacher,
            news: news
        });
    }else{
        res.render('main.ejs',{
            login: "",
            name : "",
            title: "Main Page",
            isTeacher: false,
            news: news
        });
    };
});

app.post('/', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/',
        failureFlash: true
    })
);

//---------------------------------------------------------------------------------
// Task Page
app.get('/task/:id', checkAuthenticated, async (req, res) => {
    let language = req.body.languageSelector;
    let problem = await Task.findOne({identificator: req.params.id}).exec();
    let showHint = req.user.attempts.filter(item => item.taskID == req.params.id).length >= problem.hint.attemptsForHint;
    fs.stat(path.normalize('public/processes/') + req.user.login +'_'+req.params.id, function(err,stats) {
        if (!err && Date.now()) {
            if(Date.now() - stats.birthtimeMs >= config.FolderLifeTime){
                fs.rmdirSync(path.normalize('public/processes/' + req.user.login+'_'+req.params.id),{recursive: true});
                res.redirect('/task/'+req.params.id);
            }else{
                fs.stat(path.join('public/processes/' + req.user.login+'_'+req.params.id + "/result.txt"), async function(err,stats2) {
                    if (!err) {
                        let resultStrings = fs.readFileSync(path.normalize('public/processes/' + req.user.login+'_'+req.params.id + "/result.txt"),"utf-8").trim().split("\n");
                        if(resultStrings[0] == 'Test # 1*Compilation Error*er' || resultStrings.length == problem.tests.length){

                            let result = [];
                            for(let i = 0; i < resultStrings.length; i++){
                                result.push(resultStrings[i].split('*'));
                            }
                            result.sort((a,b)=>{
                                return Number(a[0].split('#')[1]) -  Number(b[0].split('#')[1])
                            })

                            let idx = req.user.verdicts.findIndex(item => item.taskID == req.params.id)
                            if(idx==-1){
                                req.user.verdicts.push({
                                    taskID: req.params.id,
                                    result: getVerdict(result)
                                })
                            } else if(req.user.verdicts[idx].result!="OK"){
                                req.user.verdicts.splice(idx,1);
                                req.user.verdicts.push({
                                    taskID: req.params.id,
                                    result: getVerdict(result)
                                })
                            }

                            let attempts = req.user.attempts;
                            let idxx = 0;
                            let obj = {};
                            for(let k = 0; k < attempts.length; k++){
                                if( attempts[k].taskID == req.params.id){
                                    obj = req.user.attempts[k];
                                    idxx = k;
                                    break;
                                }
                            }
                            req.user.attempts.splice(idxx,1,{taskID: obj.taskID, date: obj.date,
                                programText: obj.programText, result: result, language: obj.language})
                            await req.user.save()


                            fs.rmdirSync(path.normalize('public/processes/'+req.user.login+'_'+req.params.id),{recursive: true});

                            res.redirect('/task/'+req.params.id);
                        }else{
                            res.render('task.ejs',{
                                login: req.user.login,
                                RESULT: [["","Testing..","er"]],
                                ID: req.params.id,
                                name: req.user.name,
                                title: "Task " + req.params.id,
                                isTeacher: req.user.isTeacher,
                                problem: problem,
                                prevCode: "",
                                showHint: showHint,
                                language: language
                            });
                        }
                    }else{
                        res.render('task.ejs',{
                            login: req.user.login,
                            RESULT: [["","Testing..","er"]],
                            ID: req.params.id,
                            name: req.user.name,
                            title: "Task " + req.params.id,
                            isTeacher: req.user.isTeacher,
                            problem: problem,
                            prevCode: "",
                            showHint: showHint,
                            language: req.user.attempts[0].language
                        });
                    }
                });
            }
        }else {
            let attempts = req.user.attempts;
            let result = []
            let prevCode = "";
            let language = "";
            for(let i = 0; i < attempts.length; i++){
                if( attempts[i].taskID == req.params.id){
                    result =attempts[i].result;
                    prevCode = attempts[i].programText;
                    language = attempts[i].language;
                    break;
                }
            }
            res.render('task.ejs',{
                login: req.user.login,
                RESULT: result,
                ID: req.params.id,
                name: req.user.name,
                title: "Task " + req.params.id,
                isTeacher: req.user.isTeacher,
                problem: problem,
                prevCode: prevCode,
                showHint: showHint,
                language: language
            });
        }
    });
})
// Task Page listener
app.post('/task/:id',checkAuthenticated, async (req, res) => {

    fs.stat(path.normalize('public/processes/'+req.user.login+"_"+req.params.id), async function(err) {
        if (!err) {
            res.redirect('/task/'+req.params.id);
        }
        else if (err.code === 'ENOENT') {

            let prevCode = ""
            let attempts = req.user.attempts;
            for(let i = 0; i < attempts.length; i++){
                if( attempts[i].taskID == req.params.id){
                    prevCode = attempts[i].programText;
                    result =attempts[i].result;
                    break;
                }
            }
            if(prevCode == "" || prevCode != req.body.code ){

                let language = req.body.languageSelector;

                req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
                    programText: req.body.code, result: [], language: language})
                await req.user.save()

                fs.mkdirSync(path.normalize(__dirname + '/public/processes/'+req.user.login+"_"+req.params.id));

                fs.writeFileSync(path.normalize('public/processes/'+req.user.login+"_"+req.params.id+"/programText.txt"),req.body.code,"utf-8");

                childProcess.exec('node ' + path.join(__dirname, '/public/checker/checker3'+language+'.js ') + ' ' +
                    path.join(__dirname, '/public/processes/'+req.user.login+"_"+req.params.id) + " " +
                'program'+req.user.login+"_"+req.params.id + " " +
                req.params.id)

            }
            res.redirect('/task/'+req.params.id);
        }
    });

})


//---------------------------------------------------------------------------------
// Add Task Page
app.get('/addtask',checkPermission, async (req, res) => {
    let user = req.user;
    res.render('addtask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Task",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addtask',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;

    let examples = [];
    let exI, exO ;
    for(let i =0; i < 5; i++){
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if(exI=="" || exO == "") break;
        examples.push([exI, exO]);
    }

    let tests = [];
    let tI, tO ;
    for(let i =0; i < 20; i++){
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if(tI=="" || tO == "") break;
        tests.push([tI, tO]);
    }


    let hint;
    let hintText = body.hint;
    let attemptsForHint = body.attemptsForHint;
    if(hintText && attemptsForHint){
        hint = {
            text: hintText,
            attemptsForHint: attemptsForHint,
            doesExist: true
        }
    }else{
        hint = {
            text: '',
            attemptsForHint: 0,
            doesExist: false
        }
    }

    await Adder.addTask(Task, body.title, body.statement, body.input, body.output, examples, tests, body.topic, body.grade, hint, user.name);

    res.render('addtask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Task",
        isTeacher: req.user.isTeacher
    })
})

//---------------------------------------------------------------------------------
// Tasks List Page
app.get('/tasks/:page/:search', checkAuthenticated, async (req, res) => {
    let user = req.user;
    let teachers = await User.find({ isTeacher: true });
    teachers = teachers.map(item => item.name);
    let foundTasks = []
    let a = req.params.search.split('&');
    let tasks;
    if (a[0] != "default" || a[1] != "all" || a[2] != "all" || a[3] != "false" || a[4] != "all") {
        toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
        SearchTopic = a[1].toUpperCase();
        SearchGrade = a[2]
        SortByNew = a[3] == "true";
        author = a[4]

        let properties = {}
        if (SearchGrade != "all") properties.grade = SearchGrade;
        if (author != "all") properties.author = author;
        tasks = await Task.find(properties).exec();


        const fuse = new Fuse(tasks, {
            includeScore: true,
            keys: ["title"]
        });

        if (toSearch == "")
            tasks.forEach(task => {
                if ((task.topic.split(" ").join("").trim().toUpperCase() == SearchTopic || SearchTopic == "")) {
                    foundTasks.push(task);
                }
            })
        else
            fuse.search(toSearch).forEach(task => {
                if ((task.score < 0.6 || !task.score) && (task.item.topic.split(" ").join("").trim().toUpperCase() == SearchTopic || SearchTopic == "")) {
                    foundTasks.push(task.item);
                }
            });
        if (SortByNew) foundTasks = foundTasks.reverse();
    }else{
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
    }
    let verdict;
    let verdicts = [];
    foundTasks.forEach(task => {
        verdict = user.verdicts.find(item => item.taskID == task.identificator)
        if (verdict) {
            verdict = verdict.result
        } else {
            verdict = "-"
        }
        verdicts.push(verdict);
    });

    res.render('tasks.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Tasks List",
        tasks: foundTasks,
        results: verdicts,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search,
        topics: topics,
        teachers
    })
})

app.post('/tasks/:page/:search', checkAuthenticated, async (req, res) => {
    let toSearch = req.body.searcharea;
    if (!toSearch) toSearch = "default";
    toSearch += '&' + req.body.TopicSelector + '&' + req.body.GradeSelector + '&' + req.body.SortByNew + "&" + req.body.Author;
    res.redirect('/tasks/' + req.params.page.toString() +'/' + toSearch )
})

//---------------------------------------------------------------------------------
// Edit Task Page
app.get('/edittask/:id',checkPermission, async (req, res) => {
    let problem = await Task.findOne({identificator: req.params.id}).exec()
    let user = req.user;
    res.render('edittask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Task",
        isTeacher: req.user.isTeacher,
        problem: problem
    })
})

app.post('/edittask/:id', checkAuthenticated, checkPermission, async (req, res) => {
    let body = req.body;
    let problem = await Task.findOne({ identificator: req.params.id }).exec();

    let examples = [];
    let exI, exO;
    for (let i = 0; i < 5; i++) {
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if (exI == "" || exO == "") break;
        examples.push([exI, exO]);
    }

    let tests = [];
    let tI, tO;
    for (let i = 0; i < 20; i++) {
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if (tI == "" || tO == "") break;
        tests.push([tI, tO]);
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

    problem.title = body.title;
    problem.statement = body.statement;
    problem.input = body.input;
    problem.output = body.output;
    problem.topic = body.topic;
    problem.examples = examples;
    problem.tests = tests;
    problem.hint = hint;
    await problem.save();
    res.redirect('/edittask/'+req.params.id);
});

//---------------------------------------------------------------------------------
// Delete Task
app.post('/deletetask/:id',checkAuthenticated, checkPermission, async (req, res) => {

    childProcess.exec("node " + path.join(__dirname,"/public/scripts/FixAfterDeleteTask.js")+ " "+req.params.id)

    res.redirect('/tasks/1/default&all&all')
})

//---------------------------------------------------------------------------------
// Account Page
app.get('/account/:login/:page/:search',checkAuthenticated, checkValidation, async (req, res) => {
    let user;
    if(req.user.login == req.params.login){
        user = req.user;
    } else{
        user = await User.findOne({login:req.params.login}).exec();
    }

    if(user){
        let tasks = await Task.find({}).exec();
        let tournaments = await Tournament.find({}).exec();
        let attempts = user.attempts;
        let results = [];
        let foundTasks = [];
        let foundAttempts = [];

        let a = req.params.search.split('&');
        let toSearch = a[0]=="default"? "":a[0].toUpperCase();
        let types = a[1];
        let tourTask =[]

        tournaments.forEach(tournament => tournament.tasks.forEach(task => tourTask.push(task)));
        for(let i = 0; i < attempts.length; i++){
            //verylongresult = attempts[i].result[attempts[i].result.length -1 ][attempts[i].result[attempts[i].result.length -1 ].length - 1];
            verylongresult = getVerdict(attempts[i].result);
            if ((attempts[i].taskID.split('_')[0] != '0') && ((types=='all') || (verylongresult=='OK'))){
                let task = tourTask.find(item => item.identificator == attempts[i].taskID);
                if (task && task.title.slice(0, toSearch.length).toUpperCase() == toSearch){
                    foundAttempts.push(attempts[i]);
                    foundTasks.push(task);
                }
            }
            else {
                if ((attempts[i].taskID.split('_')[0] == '0') && ((types=='all') || (verylongresult=='OK'))){
                    let task = tasks.find(item => item.identificator == attempts[i].taskID);
                    if (task && task.title.slice(0, toSearch.length).toUpperCase() == toSearch){
                        foundAttempts.push(attempts[i]);
                        foundTasks.push(task);
                    }
                }
            }
        }



        res.render('account.ejs',{
            login: req.user.login,
            u_login: user.login,
            name: req.user.name,
            title : "Account",
            results: results,
            page: req.params.page,
            isTeacher: req.user.isTeacher,
            attempts: foundAttempts,
            tasks: foundTasks,
            search: req.params.search,
            n_name: user.name,
            user: user
        })

    } else{
        res.redirect('/account/' + req.user.login + '/1/default&all')
    }
})

app.post('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
    let toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch +='&' + req.body.selector;
    res.redirect('/account/' + req.params.login.toString() + '/' + req.params.page.toString() +'/' + toSearch )
})

//---------------------------------------------------------------------------------
// Attempt Page
app.get('/attempt/:login/:date',checkAuthenticated, checkValidation, async (req, res) => {
    let user;
    if(req.user.login == req.params.login){
        user = req.user;
    } else{
        user = await User.findOne({login:req.params.login}).exec();
    }

    if(user){

        let attempts = user.attempts;
        let attempt;

        for(let i = 0; i < attempts.length; i++){
            if(attempts[i].date == req.params.date){
                attempt = attempts[i];
                break;
            }
        }

        if(attempt){
           res.render('attempt.ejs',{
                login: user.login,
                name: req.user.name,
                title : "Attempt",
                isTeacher: req.user.isTeacher,
                RESULT : attempt.result,
                code : attempt.programText,
                taskID : attempt.taskID,
                date : attempt.date,
                n_name: user.name,
                language: attempt.language
            })
        } else{
            res.redirect('/account/' + req.user.login + '/1/default&all')
        }

    } else{
        res.redirect('/account/' + req.user.login + '/1/default&all')
    }

})

//---------------------------------------------------------------------------------
// Add Lesson Page
app.get('/addlesson',checkAuthenticated,checkPermission, async (req, res) => {
    let user = req.user;
    res.render('addlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Lesson",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addlesson', checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;

    let tasks = body.tasks.split(' ').map(item => '0_' + (parseInt(item)-1));
    await Adder.addLesson(Lesson, body.grade, body.title, body.description, tasks, user.name);

    res.redirect('/addlesson');
});

//---------------------------------------------------------------------------------
// Lessons List Page
app.get('/lessons/:login/:page/:search', checkAuthenticated, async (req, res) => {

    let user;
    if(req.user.login == req.params.login || !req.user.isTeacher){
        user = req.user;

    }else{
        user = await User.findOne({login : req.params.login}).exec();
    }

    let teachers = await User.find({ isTeacher: true });
    teachers = teachers.map(item => item.name);


    let a = req.params.search.split('&');
    let toSearch = a[0] == "default" ? "" : a[0].toUpperCase();
    let SearchGrade = a[1]
    let SortByNew = a[2] == "false";
    let author = a[3].replace(/%20/g, " ");
    let usedLessons;
    let properties = {}
    if (author != "all") properties.author = author;
    if (SearchGrade != "all" || !user.isTeacher) properties.grade = user.isTeacher ? SearchGrade : user.grade;
    let lessons = (await Lesson.find(properties).exec());

    if (lessons.length!=0 && lessons[0].identificator == 0) lessons.splice(0, 1);

    // console.log(author + "|");

    const fuse = new Fuse(lessons, {
        includeScore: true,
        keys: ["title"]
    });

    usedLessons = [];
    console.log(toSearch);
    if (toSearch != "")
        fuse.search(toSearch).forEach(lesson => {
            if (lesson.score < 0.5) {
                usedLessons.push(lesson.item);
            }
        });
    if (usedLessons.length != 0)
        lessons = usedLessons;

    let results = [];
    let result;
    for (let i = 0; i < lessons.length; i++) {
        result = "/" + lessons[i].tasks.length
        let solved = 0;
        for (let k = 0; k < lessons[i].tasks.length; k++) {

            let verdict = user.verdicts.find(item => item.taskID == lessons[i].tasks[k])
            if (verdict && verdict.result == "OK") {
                solved += 1
            }
        }
        result = solved + result;
        results.push(result)
    }
    if (SortByNew){
        lessons = lessons.reverse();
        results = results.reverse();
    }

    res.render('lessons.ejs',{
        u_login: user.login,
        n_name: user.name,
        login: req.user.login,
        name: req.user.name,
        title : "Lessons List",
        lessons,
        results,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search,
        teachers
    })
})

app.post('/lessons/:login/:page/:search', checkAuthenticated, async (req, res) => {
    let toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch += '&' + (req.body.GradeSelector || 'all') + "&" + req.body.SortByNew + "&" + req.body.Author;
    res.redirect('/lessons/'+ req.params.login + '/' + req.params.page.toString() +'/' + toSearch )
})

//---------------------------------------------------------------------------------
// Lesson Page
app.get('/lesson/:login/:id',checkAuthenticated, isLessonAvailable, async (req, res) => {

    let user;
    if(req.user.login == req.params.login){
        user = req.user;
    }else{
        user = await User.findOne({login : req.params.login}).exec();
    }

    lesson = await Lesson.findOne({identificator: req.params.id}).exec();

    if (!lesson) {
        res.redirect("/lessons/"+req.params.login+"/1/default&all&all")
    }else{
        let tasks = await Task.find({identificator : {$in : lesson.tasks}});
        let verdicts = [];
        let verdict;
        for(let i=0; i < lesson.tasks.length; i++){
            verdict = user.verdicts.find(item => item.taskID == lesson.tasks[i])
            if(!verdict){
                verdict = "-"
            }else{
                verdict = verdict.result
            }
            verdicts.push(verdict)
        }
        res.render('lesson.ejs',{
            ID : lesson.identificator,
            u_login: user.login,
            u_name: user.name,
            login: user.login,
            name: req.user.name,
            title : "Lesson",
            isTeacher: req.user.isTeacher,
            lesson : lesson,
            tasks : tasks,
            results : verdicts,
        })
    }
})

//---------------------------------------------------------------------------------
// Delete Lesson
app.post('/deletelesson/:id',checkAuthenticated, checkPermission, async (req, res) => {
    childProcess.exec("node " + path.join(__dirname,"/public/scripts/FixAfterDeleteLesson.js") + " "+req.params.id)
    res.redirect('/lessons/0/1/default&all&all');
})

//---------------------------------------------------------------------------------
// Edit Lesson Page
app.get('/editlesson/:id', checkAuthenticated, checkPermission, async (req, res) => {
    let lesson = await Lesson.findOne({ identificator: req.params.id }).exec();
    lesson.tasks = lesson.tasks.map(item => parseInt(item.split('_')[1])+1);
    let user = req.user;
    res.render('editlesson.ejs', {
        login: user.login,
        name: req.user.name,
        title: "Edit Lesson",
        isTeacher: req.user.isTeacher,
        lesson: lesson
    });
});

app.post('/editlesson/:id', checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;
    let lesson = await Lesson.findOne({ identificator: req.params.id }).exec()

    lesson.title = body.title;
    lesson.description = body.description;
    lesson.grade = body.grade;
    lesson.tasks = body.tasks.split(' ').map(item => '0_'+(parseInt(item)-1));
    await lesson.save();

    res.redirect('/editlesson/'+req.params.id);
});

//---------------------------------------------------------------------------------
// Students List Page
app.get('/students/:page/:search', checkAuthenticated, checkPermission,async (req, res) => {
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
        let SearchLetter = a[2] == "all" ? '' : a[2].toUpperCase();
        let SearchGroup = a[3] == "all" ? '' : a[3];
        foundStudents = []
        const fuse = new Fuse(students, {
            includeScore: true,
            keys: ['name']
        });
        if (toSearch == "")
            students.forEach(student => {
                if((student.gradeLetter == SearchLetter || SearchLetter == "") && (student.group == SearchGroup || SearchGroup == "")) {
                    foundStudents.push(student);
                }
            });
        else
            fuse.search(toSearch).forEach(student => {
                if((student.score < 0.5) && (student.item.gradeLetter == SearchLetter || SearchLetter == "") && (student.item.group == SearchGroup || SearchGroup == "")) {
                    foundStudents.push(student.item);
                }
            });
    } else {
        foundStudents = students;
    }
    foundStudents.sort((a, b) => { return a.name > b.name });

    res.render('students.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Students List",
        isTeacher: req.user.isTeacher,
        page: max(req.params.page, 1),
        search: req.params.search,
        students : foundStudents
    })
})

app.post('/students/:page/:search', checkAuthenticated, checkPermission, async (req, res) => {
    let toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch += '&' + req.body.GradeSelector  +
        '&' + (req.body.gradeLetter || "all") +
        '&' + (req.body.Group || "all")
    let keys = Object.keys(req.body)
    let student;
    for(let i = 0; i<keys.length; i++){
        if(keys[i].slice(0, 6)=="login:"){
            student = await User.findOne({login: keys[i].slice(6)})
            if(student.group != req.body[keys[i]]){
                student.group = req.body[keys[i]]
                await student.save()
            }
    }
    }
    res.redirect('/students/' + req.params.page.toString() +'/' + toSearch )
})

//---------------------------------------------------------------------------------
// Add News Page
app.get('/addnews',checkAuthenticated,checkPermission, async (req, res) => {
    let user = req.user;
    res.render('addnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add News",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addnews',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;

    let new_news = await Adder.addNews(News, body.title, body.text, body.reference, user.name);
    news.push(new_news);

    res.render('addnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add News",
        isTeacher: req.user.isTeacher
    })
})

//---------------------------------------------------------------------------------
// Delete News
app.post('/deletenews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    await News.deleteOne({identificator: req.params.id}).exec();
    news.splice(news.findIndex(item => item.identificator==req.params.id),1)
    res.redirect('/');
})

//---------------------------------------------------------------------------------
// Edit News Pages
app.get('/editnews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    one_news = news.find(item => item.identificator==req.params.id)
    let user = req.user;
    res.render('editnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit News",
        isTeacher: req.user.isTeacher,
        news: one_news
    })
})

app.post('/editnews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;
    let newsDB = await News.findOne({identificator: req.params.id}).exec()

    newsDB.title = body.title;
    newsDB.text = body.text;
    newsDB.reference = body.reference;
    await newsDB.save();

    let idx = news.findIndex(item => item.identificator==req.params.id)
    news[idx].title = body.title;
    news[idx].text = body.text;
    news[idx].reference = body.reference;

    res.render('editnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit News",
        isTeacher: req.user.isTeacher,
        news: newsDB
    })
})


//---------------------------------------------------------------------------------
// Add Tournament Page
app.get('/addtournament',checkAuthenticated,checkPermission, async (req, res) => {
    let user = req.user;
    res.render('addtournament.ejs',{
        login: user.login,
        name: req.user.name,
        title: "Add Tournament",
        isTeacher: req.user.isTeacher
    })
})//V

app.post('/addtournament',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;
    let tasks = [];
    await Adder.addTournament(Tournament, body.title, body.description,
        tasks, user.name, body.whenStarts.replace('T', ' '),
        body.whenEnds.replace('T', ' '), [], body.allowRegAfterStart=="on" );

    res.render('addtournament.ejs',{
        login: user.login,
        name: req.user.name,
        title: "Add Tournament",
        isTeacher: req.user.isTeacher
    })
})//V

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

    let Tournaments = (await Tournament.find({}).exec()).slice(1);

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


    let result;
    for (let i = 0; i < foundTournaments.length; i++){
        result = "/" + foundTournaments[i].tasks.length
        let solved = 0;
        for (let k = 0; k < foundTournaments[i].tasks.length; k++){

            let verdict = user.verdicts.find(item => item.taskID == foundTournaments[i].tasks[k].identificator)
            if(verdict && verdict.result=="OK"){
                solved+=1
            }
        }
        result = solved + result;
        results.push(result)
    }

    //?
    let obj = [];
    for(let i=0;i<foundTournaments.length;i++){
        obj.push([foundTournaments[i], results[i]]);
    }
    obj.sort(compareTournaments);

    for(let i=0;i<foundTournaments.length;i++){
        foundTournaments[i] = obj[i][0];
    }
    for(let i=0;i<results.length;i++){
        results[i] = obj[i][1];
    }

    //?
    foundTournaments.sort((a, b) => { return a._id < b._id })

    res.render('tournaments.ejs',{
        u_login: user.login,
        n_name: user.name,
        login: req.user.login,
        name: req.user.name,
        title: "Tournaments List",
        tournaments: foundTournaments,
        results: results,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search
    })
})//V

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
    res.redirect('/tournaments/'+ req.params.login + '/' + req.params.page.toString() +'/' + toSearch )
})//V


//---------------------------------------------------------------------------------
// Edit Tournament Page
app.get('/edittournament/:id',checkAuthenticated, checkPermission, async (req, res) => {
    let tournament = await Tournament.findOne({ identificator: req.params.id }).exec();
    let user = req.user;
    res.render('edittournament.ejs',{
        login: user.login,
        name: req.user.name,
        title: "Edit Tournament",
        isTeacher: req.user.isTeacher,
        tournament: tournament
    })
})//V

app.post('/edittournament/:id',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;
    let tournament = await Tournament.findOne({identificator: req.params.id}).exec()

    tournament.title = body.title;
    tournament.description = body.description;
    if(body.whenStarts)
        tournament.whenStarts = body.whenStarts.replace('T', ' ');
    tournament.whenEnds = body.whenEnds.replace('T', ' ');
    tournament.allowRegAfterStart = body.allowRegAfterStart=="on";
    await tournament.save();

    res.render('edittournament.ejs',{
        login: user.login,
        name: req.user.name,
        title: "Edit Tournament",
        isTeacher: req.user.isTeacher,
        tournament: tournament
    })
})//V


//---------------------------------------------------------------------------------
//Register to tournament
app.get('/regTournament/:tournament_id', checkAuthenticated, async (req, res) => {
    let tournament = await Tournament.findOne({ identificator: req.params.tournament_id }).exec()
    if (!tournament.isBegan || tournament.allowRegAfterStart) {
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
    res.redirect('/tournaments/'+req.user.login+'/1/default&all&all')
})


//---------------------------------------------------------------------------------
// Add Task to Tournament Page
app.get('/addtask_tt/:tour_id', checkPermission, async (req, res) => {
    let user = req.user;
    let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec()
    res.render('addtasktournament.ejs', {
        login: user.login,
        name: req.user.name,
        title: "Add Task",
        tournament: tournament,
        isTeacher: req.user.isTeacher
    });
});

app.post('/addtask_tt/:tour_id',checkAuthenticated, checkPermission, async (req, res) => {
    let user = req.user;
    let body = req.body;


    let examples = [];
    let exI, exO ;
    for(let i =0; i < 5; i++){
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if(exI=="" || exO == "") break;
        examples.push([exI, exO]);
    }

    let tests = [];
    let tI, tO ;
    for(let i =0; i < 20; i++){
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if(tI=="" || tO == "") break;
        tests.push([tI, tO]);
    }

    await Adder.addTaskToTournament(Tournament, req.params.tour_id, body.title, body.statement, examples, tests);

    res.redirect('/addtask_tt/' + req.params.tour_id);
});

//---------------------------------------------------------------------------------
// Delete Task from Tournament
app.post('/deletetask_tt/:tour_id/:id', checkAuthenticated, checkPermission, async (req, res) => {

    childProcess.exec("node " + path.join(__dirname, "/public/scripts/FixAfterDeleteTournamentTask.js") + " " +
        req.params.tour_id + " " + req.params.id)

    res.redirect('/tournament/' + req.user.login + '/' + req.params.tour_id);
});


//---------------------------------------------------------------------------------
// Tournament Task Page
app.get('/task_tt/:tour_id/:id', checkTournamentPermission ,checkAuthenticated, async (req, res) => {
    let tour_id = req.params.tour_id
    let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
    let whenEnds = tournament.whenEnds;
    let isBegan = tournament.isBegan;

    let language = req.body.languageSelector;
    problem = tournament.tasks.find(item => item.identificator == req.params.id);
    fs.stat(path.normalize('public/processes/' + req.user.login + '_' + req.params.id), function (err, stats) {
        if (!err && Date.now()) {
            if (Date.now() - stats.birthtimeMs >= config.FolderLifeTime) {
                fs.rmdirSync(path.normalize('public/processes/' + req.user.login + '_' + req.params.id), { recursive: true });

                res.redirect('/task_tt/' + tour_id + '/' + req.params.id);
            } else {
                fs.stat(path.normalize('public/processes/' + req.user.login + '_' + req.params.id + "/result.txt"), async function (err, stats2) {
                    if (!err) {
                        let resultStrings = fs.readFileSync(path.normalize('public/processes/' + req.user.login + '_' + req.params.id + "/result.txt"), "utf-8").trim().split("\n");
                        if (resultStrings[0] == 'Test # 1*Compilation Error*er' || resultStrings.length == problem.tests.length) {

                            let result = [];
                            for (let i = 0; i < resultStrings.length; i++) {
                                result.push(resultStrings[i].split('*'));
                            }
                            result.sort((a, b) => {
                                return Number(a[0].split('#')[1]) - Number(b[0].split('#')[1])
                            })

                            let idx = req.user.verdicts.findIndex(item => item.taskID == req.params.id)
                            if (idx == -1) {
                                req.user.verdicts.push({
                                    taskID: req.params.id,
                                    result: getVerdict(result)
                                })
                            } else if (req.user.verdicts[idx].result != "OK") {
                                req.user.verdicts.splice(idx, 1);
                                req.user.verdicts.push({
                                    taskID: req.params.id,
                                    result: getVerdict(result)
                                })
                            }

                            let attempts = req.user.attempts;
                            let idxx = 0;
                            let obj = {};
                            for (let k = 0; k < attempts.length; k++) {
                                if (attempts[k].taskID == req.params.id) {
                                    obj = req.user.attempts[k];
                                    idxx = k;
                                    break;
                                }
                            }
                            req.user.attempts.splice(idxx, 1, {
                                taskID: obj.taskID,
                                date: obj.date,
                                programText: obj.programText,
                                result: result,
                                language: obj.language
                            })
                            await req.user.save()

                            let score =  getScore(result);
                            tournament.attempts.push({
                                login: req.user.login,
                                AttemptDate: req.user.attempts[0].date,
                                TaskID: req.params.id,
                                score
                            });

                            // tournament results update
                            let user_result_idx = tournament.results.findIndex(item => item.login == req.user.login.toString());
                            let task_idx =req.params.id.split('_')[1];
                            if (!tournament.isEnded && user_result_idx!=-1 && tournament.results[user_result_idx].tasks[task_idx].score!=100){
                                tournament.results[user_result_idx].tasks[task_idx].tries +=1;
                                if( tournament.results[user_result_idx].tasks[task_idx].score < score){
                                    tournament.results[user_result_idx].sumscore -= tournament.results[user_result_idx].tasks[task_idx].score;
                                    tournament.results[user_result_idx].sumscore += score;
                                    tournament.results[user_result_idx].tasks[task_idx].score = score;

                                    let now = new Date();
                                    tournament.results[user_result_idx].sumtime -= tournament.results[user_result_idx].tasks[task_idx].dtime;
                                    tournament.results[user_result_idx].sumtime += now-Date.parse(tournament.whenStarts);
                                    tournament.results[user_result_idx].tasks[task_idx].dtime = now-Date.parse(tournament.whenStarts);

                                }
                            }
                            tournament.markModified("results");
                            await tournament.save()


                            fs.rmdirSync(path.normalize('public/processes/' + req.user.login + '_' + req.params.id), { recursive: true });

                            res.redirect('/task_tt/' + tour_id + '/' + req.params.id);
                        } else {
                            res.render('tournamenttask.ejs', {
                                login: req.user.login,
                                RESULT: [["", "Testing..", "er"]],
                                ID: req.params.id,
                                TUR_ID: req.params.tour_id,
                                name: req.user.name,
                                title: "Task " + req.params.id,
                                isTeacher: req.user.isTeacher,
                                problem: problem,
                                prevCode: "",
                                language: language,
                                whenEnds: whenEnds,
                                isBegan: isBegan
                            });
                        }
                    } else {
                        res.render('tournamenttask.ejs', {
                            login: req.user.login,
                            RESULT: [["", "Testing..", "er"]],
                            ID: req.params.id,
                            TUR_ID: req.params.tour_id,
                            name: req.user.name,
                            title: "Task " + req.params.id,
                            isTeacher: req.user.isTeacher,
                            problem: problem,
                            prevCode: "",
                            language: req.user.attempts[0].language,
                            whenEnds: whenEnds,
                                isBegan: isBegan
                        });
                    }
                });
            }
        } else {
            let attempts = req.user.attempts;
            let result = []
            let prevCode = "";
            let language = "";
            for (let i = 0; i < attempts.length; i++) {
                if (attempts[i].taskID == req.params.id) {
                    result = attempts[i].result;
                    prevCode = attempts[i].programText;
                    language = attempts[i].language;
                    break;
                }
            }
            res.render('tournamenttask.ejs', {
                login: req.user.login,
                RESULT: result,
                ID: req.params.id,
                TUR_ID: req.params.tour_id,
                name: req.user.name,
                title: "Task " + req.params.id,
                isTeacher: req.user.isTeacher,
                problem: problem,
                prevCode: prevCode,
                language: language,
                whenEnds: whenEnds,
                isBegan: isBegan
            });
        }
    });
});
// Tournament Task Page listener
app.post('/task_tt/:tour_id/:id', checkAuthenticated, async (req, res) => {
    fs.stat(path.normalize('public/processes/' + req.user.login + '_' + req.params.id), async function (err) {
        if (!err) {
            res.redirect('/task_tt/' + req.params.tour_id + '/' + req.params.id);
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
            if (prevCode == "" || prevCode != req.body.code) {

                let language = req.body.languageSelector;

                req.user.attempts.unshift({
                    taskID: req.params.id, date: Date.now().toString(),
                    programText: req.body.code, result: [], language: language
                })
                await req.user.save()

                fs.mkdirSync(path.normalize('public/processes/' + req.user.login + '_' + req.params.id));

                fs.writeFileSync(path.normalize('public/processes/' + req.user.login + '_' + req.params.id + "/programText.txt"), req.body.code, "utf-8");

                childProcess.exec('node ' + path.join(__dirname, '/public/checker/checker3' + language + '.js') + ' ' +
                    path.join(__dirname, '/public/processes/' + req.user.login + '_' + req.params.id) + " " +
                    'program' + req.user.login + '_' + req.params.id + " " +
                    req.params.id)

            }
            res.redirect('/task_tt/' + req.params.tour_id + '/' + req.params.id);
        }
    });

});

//---------------------------------------------------------------------------------
// Tournament Page
app.get('/tournament/:login/:id', checkAuthenticated, checkTournamentValidation, async (req, res) => {
    let user;
    if (req.user.login == req.params.login) {
        user = req.user;
    } else {
        user = await User.findOne({ login: req.params.login }).exec();
    }

    let tournament = await Tournament.findOne({identificator:req.params.id}).exec();
    if (!tournament) {
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
        if (!(req.user.isTeacher || tournament.isEnded || tournament.isBegan && tournament.results.find(item => item.login == req.params.login))) {
            tasks = [];
        }
        if(!tournament.isBegan && tournament.results.find(item => item.login == req.params.login)){
            registered = true;
        }
        res.render('tournament.ejs', {
            ID: tournament.identificator,
            u_login: user.login,
            u_name: user.name,
            login: user.login,
            name: req.user.name,
            title: "Tournament",
            isTeacher: req.user.isTeacher,
            tournament: tournament,
            tasks: tasks,
            results: verdicts,
            registered: registered
        });
    }
})//V

//---------------------------------------------------------------------------------
// Edit tournament task

app.get('/edittask_tt/:tour_id/:id', checkAuthenticated, checkPermission, async (req, res) => {
    let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
    let task = tournament.tasks.find(item => item.identificator == req.params.id);
    res.render('edittasktournament.ejs', {
        login: req.user.login,
        name: req.user.name,
        title: "Edit Tournament Task",
        isTeacher: req.user.isTeacher,
        task: task,
        tour_id: req.params.tour_id
    })
});

app.post('/edittask_tt/:tour_id/:id', checkAuthenticated, checkPermission, async (req, res) => {
    let body = req.body;
    let user = req.user;
    let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
    let problem = tournament.tasks.find(item => item.identificator == req.params.id);

    let examples = [];
    let exI, exO;
    for (let i = 0; i < 5; i++) {
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if (exI == "" || exO == "") break;
        examples.push([exI, exO]);
    }

    let tests = [];
    let tI, tO;
    for (let i = 0; i < 20; i++) {
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if (tI == "" || tO == "") break;
        tests.push([tI, tO]);
    }

    problem.title = body.title;
    problem.statement = body.statement;
    problem.examples = examples;
    problem.tests = tests;

    tournament.markModified('tasks');
    await tournament.save();

    res.redirect('/edittask_tt/'+req.params.tour_id + '/' + req.params.id);
});

//---------------------------------------------------------------------------------
// Tournament results page
app.get('/results/:tour_id/:showTeachers/', checkAuthenticated, async (req, res) => {
    let tournament = await Tournament.findOne({ identificator: req.params.tour_id });
    if (tournament) {
        let results = [];
        for(let i=0;i<tournament.results.length;i++){
            let user = await User.findOne({login:tournament.results[i].login})
            results.push([tournament.results[i], user.isTeacher]);
        }
        res.render('tournamentresults.ejs', {
            login: req.user.login,
            name: req.user.name,
            title: "Tournament Results",
            isTeacher: req.user.isTeacher,
            ID: req.params.tour_id,
            tournament: tournament,
            results: results,
            showTeachers: req.params.showTeachers=="1"
        });
    } else {
        res.redirect('/');
    }
});

//---------------------------------------------------------------------------------
// Tournament attempts page
app.get('/tournament/attempts/:tour_id/:toSearch', checkAuthenticated, checkPermission, async (req, res) => {
    let a = req.params.toSearch.split('&');
    let loginSearch = a[0] == "all" ? "" : a[0].toUpperCase;
    let taskSearch = a[1] == "all" ? "" : a[1].toUpperCase;
    let success = a[2] != "all";
    let needTasks = a[1] != "all";
    let needLogin = a[0] != "all";

    let tournament = await Tournament.findOne({ identificator: req.params.tour_id }).exec();
    let attempts = tournament.attempts;

    let taskIDs = [];//IDs of needed tasks
    if (needTasks) {
        //find Tasks
    }
    let Logins = [];
    if (needLogin) {
        //find Logins
    }
    //search
    attempts.filter(item => (!success || item.score == 100) && (!needTasks || item.taskID in taskIDs)&&(!needLogin || item.login in Logins))

    let tasks = attempts.map(attempt => tournament.taks.findOne(task => task.identificator == attempt.taskID));
    let globalAttempts = attempts.map(attempt => req.user.attempts.findOne(item => item._id == attempt.AttemptID).date);

    res.render('tournamentattempts.ejs',{
        login: req.user.login,
        name: req.user.name,
        title: tournament.title,
        isTeacher: req.user.isTeacher,
        tourID: tournament.identificator,
        attempts,
        tasks,
        realAttempts: globalAttempts
    });
});
app.post('/tournament/attempts/:tour_id/:toSearch', checkAuthenticated, checkPermission, async (req, res) => {
    let toSearch = req.body.loginSearch.trim() == "" ? "all" : req.body.loginSearch.trim();
    toSearch += '&' + (req.body.taskSearch.trim() == "" ? "all" : req.body.taskSearch.trim());
    toSearch += '&' + (req.body.selector);
    res.redirect(`/tournament/attempts/${req.params.tour_id}/${toSearch}`);
});

//---------------------------------------------------------------------------------
// About Page
app.get('/about',checkAuthenticated, async (req, res) => {
    res.render('about.ejs', {
        login: req.user.login,
        name: req.user.name,
        title: "About",
        isTeacher: req.user.isTeacher
    });
});

//---------------------------------------------------------------------------------
// Edit Group
app.post('/editgroup/:login/:page/:search',checkAuthenticated,checkPermission, async (req, res) => {
    let student = await User.findOne({login: req.params.login})
    if(req.body.groupEditor){
        student.group = req.body.groupEditor;
        await student.save()
    }
    res.redirect('/students' + '/' +req.params.page +'/' + req.params.search);
})

//---------------------------------------------------------------------------------
// ??? toDo
app.get('/egg1',checkAuthenticated, checkNotPermission, async (req, res) => {
    res.sendFile(__dirname+'/views/20122020.html')
})
app.get('/MazeByMalveetha&Dsomni',checkAuthenticated, checkNotPermission, async (req, res) => {
    res.sendFile(__dirname+'/views/21122020.html')
})
app.get('/emojiegg',checkAuthenticated, checkNotPermission, async (req, res) => {
    res.sendFile(__dirname+'/views/19012021.html')
})

//---------------------------------------------------------------------------------
// Log Out
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})


//---------------------------------------------------------------------------------
// Redirect from empty pages
app.get('*', (req,res) => {
    res.redirect('/');
})

//---------------------------------------------------------------------------------
// Functions

async function checkAuthenticated(req, res, next) {
    //await checkTimings();
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
    }else{
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

async function checkTournamentPermission(req, res, next){
    let tour_id = req.params.tour_id
    let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
    let isBegan = tournament.isBegan;

    if(!req.user) return res.redirect("/");
    if(req.user.isTeacher || tournament.isEnded || (isBegan && tournament.results.find(item => item.login == req.user.login))){
        return next();
    }
    res.redirect('/tournament/' + req.user.login + '/' + tour_id);
}

async function isLessonAvailable(req, res, next) {
    lesson = await Lesson.findOne({identificator : req.params.id}).exec();
    if (req.user.isTeacher || (req.user.grade == lesson.grade)) {
        return next()
    }
    res.redirect('/lessons/' + req.user.login + '/1/default&all')
}

let max = (a, b)=>{if(a>b)return a;return b};

function getVerdict(results){
    for(let i=0;i<results.length;i++){
        if(results[i][1]!="OK"){
            return results[i][1];
        }
    }
    if(results.length>0)
        return "OK";
    return 'err';
}

function getScore(results){
    return Math.ceil(results.filter(item => item[2]=="ok").length/results.length*100)
}

function compareTournaments(a,b){
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

    if(a_now && b_now)
        return a_fDate - b_fDate;
    if(a_now && !b_now)
        return -1;
    if(!a_now && b_now)
        return 1;

    if(a_wait && b_wait)
        return a_sDate - b_sDate;
    if(a_wait && !b_wait)
        return -1;
    if(!a_wait && b_wait)
        return 1;
    return b_fDate- a_fDate;

}

//---------------------------------------------------------------------------------
// Tournirnaments timer checker start
setInterval(()=>{
    childProcess.exec('node ' + path.join(__dirname, '/public/scripts/Tchecker.js'));
},1000*60*10)

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
