// Connecting Modules
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const config = require('./config/db');
const expressLayouts = require('express-ejs-layouts');
const childProcess = require("child_process");
const taskAdder = require(__dirname + '/public/scripts/addTask.js');
const lessonAdder = require(__dirname + '/public/scripts/addLesson.js');
const newsAdder = require(__dirname + '/public/scripts/addNews.js');
const app = express()

var max = (a, b)=>{if(a>b)return a;return b}

//MongoDB connecting  
mongoose.connect(config.db,{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoose.connection.on('connected', () => {
    console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
    console.log("Error while connecting to DB: "+ err);
});

mongoose.set('useCreateIndex', true);

var UserSchema = new mongoose.Schema({
    login: { 
        type: String, 
        unique: true,
        index: true
    },
    password: String,
    name : String,

    grade: String,
    gradeLetter: String,
    attempts: Array,

    isTeacher: Boolean,
    hasClasses: Array
}, {collection: 'users'});

var TaskSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    statement: String,
    examples: Array,
    tests: Array,
    topic: String,
    author: String

}, {collection: 'tasks'});


var LessonSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    description: String,
    tasks: Array,
    author: String

}, {collection: 'lessons'});

var NewsSchema = new mongoose.Schema({
    identificator: Number,
    title : String,
    text: String,
    reference: String,
    date :  String,
    author: String

}, {collection: 'news'});

// Create model from schema
var News = mongoose.model('News', NewsSchema );

// Create model from schema
var Lesson = mongoose.model('Lesson', LessonSchema );

// Create model from schema
var Task = mongoose.model('Task', TaskSchema );

// Create model from schema
var User = mongoose.model('User', UserSchema );

const initializePassport = require('./config/passport');
const e = require('express');
initializePassport(
  passport,
  User
)

// Settings
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use('/public',express.static('public')); //where search for static files

app.use(expressLayouts);
app.set('layout', 'layout.ejs')
app.use(flash())
app.use(session({
  secret: config.secret,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

// Main Page
app.get('/', async (req, res) => {

    var news = await News.find({}).exec();;
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
    }
})

app.post('/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/',
    failureFlash: true
}))


// Task Page
app.get('/task/:id', checkAuthenticated, async (req, res) => {
    var problem = await Task.findOne({identificator: req.params.id}).exec()

    fs.stat('public\\processes\\'+req.user.login+req.params.id, function(err) {
        if (!err) {
            fs.stat('public\\processes\\'+req.user.login+req.params.id+"\\result.txt", function(err) {
                if (!err) {

                    var resultStrings = fs.readFileSync('public\\processes\\'+req.user.login+req.params.id+"\\result.txt","utf-8").trim().split("\n");
                    var codeText = fs.readFileSync('public\\processes\\'+req.user.login+req.params.id+"\\programText.txt","utf-8").trim();
                    var result = [];
                    for(var i = 0; i < resultStrings.length; i++){
                        result.push(resultStrings[i].split('*'));
                    }

                    req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
                        programText: codeText, result: result})
                    req.user.save()

                    fs.rmdirSync('public\\processes\\'+req.user.login+req.params.id,{recursive: true});

                    res.redirect('/task/'+req.params.id);
        
                }else if (err.code === 'ENOENT'){
                    res.render('task.ejs',{
                        login: req.user.login,
                        RESULT: [["","Testing..","er"]],
                        ID: req.params.id,
                        name: req.user.name, 
                        title: "Task " + req.params.id,
                        isTeacher: req.user.isTeacher,
                        problem: problem,
                        prevCode: ""
                    });  
                }
            });
        }else {
            var attempts = req.user.attempts;
            var result = []
            var prevCode = "";
            for(var i = 0; i < attempts.length; i++){
                if( attempts[i].taskID == req.params.id){
                    result =attempts[i].result;
                    prevCode = attempts[i].programText;
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
                prevCode: prevCode
            }); 
        }
    });
})

// Task Page listener
app.post('/task/:id',checkAuthenticated, async (req, res) => {

    fs.stat('public\\processes\\'+req.user.login+req.params.id, async function(err) {
        if (!err) {
            res.redirect('/task/'+req.params.id);
        }
        else if (err.code === 'ENOENT') {

            var prevCode = ""
            var result="";
            var attempts = req.user.attempts;
            for(var i = 0; i < attempts.length; i++){
                if( attempts[i].taskID == req.params.id){
                    prevCode = attempts[i].programText;
                    result =attempts[i].result;
                    break;
                }
            }
            if(prevCode == "" || prevCode != req.body.code ){


                var programText = req.body.code;
                let idx = programText.toUpperCase().indexOf('BEGIN')
                if (idx == -1){
                    // Parsing Error
                    req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
                        programText: req.body.code, result: [["Test #1 ", "Presentation Error" ,"er"]]})
                    req.user.save()

                    res.redirect('/task/'+req.params.id);
                    return;
                }

                // Parsing is OK
                fs.mkdirSync('public\\processes\\'+req.user.login+req.params.id);

                fs.writeFileSync('public\\processes\\'+req.user.login+req.params.id+"\\programText.txt",req.body.code,"utf-8");

                childProcess.exec('node ' + __dirname + '\\public\\checker\\checker.js ' +
                __dirname+'\\public\\processes\\'+req.user.login+req.params.id + " " +
                'program'+req.user.login+req.params.id + " " +
                req.params.id)

            }
            res.redirect('/task/'+req.params.id);
        }
    });

})

// Account Page
app.get('/account/:login/:page/:search',checkAuthenticated, checkValidation, async (req, res) => {
    var user;
    if(req.user.login == req.params.login){
        user = req.user;
    } else{
        user = await User.findOne({login:req.params.login}).exec();
    }

    if(user){
        var tasks = await Task.find({}).exec();
        var attempts = user.attempts;
        var results = [];
        var foundTasks = [];
        var foundAttempts = [];

        var a = req.params.search.split('&');
        var toSearch = a[0];
        var types = a[1];
        if(toSearch == "default") toSearch="";


        for(var i = 0; i < attempts.length; i++){
            verylongresult = attempts[i].result[attempts[i].result.length -1 ][attempts[i].result[attempts[i].result.length -1 ].length - 1];
            if((tasks[attempts[i].taskID].title.slice(0, toSearch.length) == toSearch) &&
             (  (types=='all') ||  (verylongresult=='ok') )){
                foundAttempts.push(attempts[i]);
                foundTasks.push(tasks[attempts[i].taskID]);
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
            n_name: user.name
        })
    
    } else{
        res.redirect('/account/' + req.user.login + '/1/default&all')
    }
})

app.post('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch +='&' + req.body.selector;
    res.redirect('/account/' + req.params.login.toString() + '/' + req.params.page.toString() +'/' + toSearch )
})




// Add Task Page
app.get('/addtask',checkPermission, async (req, res) => {
    var user = req.user;
    res.render('addtask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Task",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addtask',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;

    var examples = [];
    var exI, exO ;
    for(var i =0; i < 5; i++){
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if(exI=="" || exO == "") break;
        examples.push([exI, exO]);
    }

    var tests = [];
    var tI, tO ;
    for(var i =0; i < 20; i++){
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if(tI=="" || tO == "") break;
        tests.push([tI, tO]);
    }

    await taskAdder.addTask(Task, body.title, body.statement, examples, tests, body.topic,body.grade, user.name);

    res.render('addtask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Task",
        isTeacher: req.user.isTeacher
    })
})

// Tasks List Page
app.get('/tasks/:page/:search', checkAuthenticated, async (req, res) => {
    var user = req.user;
    var attempts = req.user.attempts;
    var results = [];
    var foundTasks = [];
    var tasks = await Task.find({}).exec();
    var a = req.params.search.split('&');
    toSearch = a[0];
    SearchTopic = a[1];
    SearchGrade = a[2];
    if(toSearch == "default") toSearch="";
    var topics=[];
    var result;
    for (var i = 0; i < tasks.length; i++){
        if(topics.indexOf(tasks[i].topic)==-1){
            topics.push(tasks[i].topic);
        }
        if((tasks[i].title.slice(0, toSearch.length) == toSearch) && 
        (SearchTopic == 'all' || SearchTopic==tasks[i].topic.replace(" ", "")) && 
        (SearchGrade == 'all' || SearchGrade==tasks[i].grade)){
            foundTasks.push(tasks[i])
            result = ""
            for(var j = attempts.length-1; j >= 0; j--){
                if( attempts[j].taskID == i){
                    result = attempts[j].result[attempts[j].result.length - 1][1];
                    if(result == "OK") break;
                }
            }
            if(result=="") result = "-";
            results.push(result)
        }
    }
    res.render('tasks.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Tasks List",
        tasks: foundTasks,
        results: results,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search,
        topics: topics
    })
})

app.post('/tasks/:page/:search', checkAuthenticated, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch += '&' + req.body.TopicSelector +'&' + req.body.GradeSelector
    res.redirect('/tasks/' + req.params.page.toString() +'/' + toSearch )
})


// Edit Task Page
app.get('/edittask/:id',checkPermission, async (req, res) => {
    var problem = await Task.findOne({identificator: req.params.id}).exec()
    var user = req.user;
    res.render('edittask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Task",
        isTeacher: req.user.isTeacher,
        problem: problem
    })
})

app.post('/edittask/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;
    var problem = await Task.findOne({identificator: req.params.id}).exec()

    var examples = [];
    var exI, exO ;
    for(var i =0; i < 5; i++){
        eval("exI = body.exampleIn" + i)
        eval("exO = body.exampleOut" + i)
        if(exI=="" || exO == "") break;
        examples.push([exI, exO]);
    }

    var tests = [];
    var tI, tO ;
    for(var i =0; i < 20; i++){
        eval("tI = body.testIn" + i)
        eval("tO = body.testOut" + i)
        if(tI=="" || tO == "") break;
        tests.push([tI, tO]);
    }

    problem.title = body.title;
    problem.statement = body.statement;
    problem.topic = body.topic;
    problem.examples = examples;
    problem.tests = tests;
    await problem.save();
    res.render('edittask.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Task",
        isTeacher: req.user.isTeacher,
        problem: problem
    })
})

// Delete Task Page
app.get('/deletetask/:id',checkPermission, async (req, res) => {
    var problem = await Task.findOne({identificator: req.params.id}).exec()

    res.render('deletetask.ejs',{
        login: req.user.login,
        name: req.user.name,
        title : "Delete Task",
        isTeacher: req.user.isTeacher,
        problem: problem
    })
})

app.post('/deletetask/:id',checkAuthenticated, checkPermission, async (req, res) => {
    await Task.deleteOne({identificator: req.params.id}).exec();

    /* add popup */

    res.redirect('/tasks/1/default&all&all');
})

// Attempt Page
app.get('/attempt/:login/:date',checkAuthenticated, checkValidation, async (req, res) => {
    var user;
    if(req.user.login == req.params.login){
        user = req.user;
    } else{
        user = await User.findOne({login:req.params.login}).exec();
    }

    if(user){

        var attempts = user.attempts;
        var attempt;

        for(var i = 0; i < attempts.length; i++){
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
                n_name: user.name
            }) 
        } else{
            console.log(1)
            res.redirect('/account/' + req.user.login + '/1/default&all')
        }

    } else{
        console.log(2)
        res.redirect('/account/' + req.user.login + '/1/default&all')
    }

})


// Add Lesson Page
app.get('/addlesson',checkAuthenticated,checkPermission, async (req, res) => {
    var user = req.user;
    res.render('addlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Lesson",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addlesson',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;

    var tasks = body.tasks.split(' ');

    await lessonAdder.addLesson(Lesson, body.grade, body.title, body.description, tasks, user.name);

    res.render('addlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Lesson",
        isTeacher: req.user.isTeacher
    })
})

// Lessons List Page
app.get('/lessons/:login/:page/:search', checkAuthenticated, async (req, res) => {

    var user;
    if(req.user.login == req.params.login){
        user = req.user;
    }else{
        user = await User.findOne({login : req.params.login}).exec();
    }

    var attempts = user.attempts;
    var results = [];
    var foundLessons = [];

    var a = req.params.search.split('&');
    var toSearch = a[0];
    var lessons;
    if(user.isTeacher){
        lessons = await Lesson.find({}).exec();
        SearchGrade = a[1];

    }else{
        SearchGrade = user.grade;
        lessons = await Lesson.find({grade: SearchGrade}).exec();
    }

    if(toSearch == "default") toSearch="";

    var result;
    for (var i = 0; i < lessons.length; i++){
        if((lessons[i].title.slice(0, toSearch.length) == toSearch) && 
        (SearchGrade == 'all' || SearchGrade==lessons[i].grade)){
            foundLessons.push(lessons[i])
            result = "/" + lessons[i].tasks.length
            var solved = 0;
            for(var k = 0; k < lessons[i].tasks.length; k++){
                var taskid = lessons[i].tasks[k];
                 for(var j = attempts.length-1; j >= 0; j--){
                    if( attempts[j].taskID == taskid){
                        if(attempts[j].result[attempts[j].result.length - 1][1] == "OK"){
                            solved+=1
                            break;
                        } 
                    }
                }
            }
            result = solved + result;
            results.push(result)
        }
    }

    res.render('lessons.ejs',{
        u_login: user.login,
        n_name: user.name,
        login: req.user.login,
        name: req.user.name,
        title : "Lessons List",
        lessons: foundLessons,
        results: results,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search
    })
})

app.post('/lessons/:login/:page/:search', checkAuthenticated, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch += '&' + req.body.GradeSelector
    res.redirect('/lessons/'+ req.params.login + '/' + req.params.page.toString() +'/' + toSearch )
})


// Lesson Page
app.get('/lesson/:login/:id',checkAuthenticated, async (req, res) => {

    var user;
    if(req.user.login == req.params.login){
        user = req.user;
    }else{
        user = await User.findOne({login : req.params.login}).exec();;
    }


    var lesson = await Lesson.findOne({identificator: req.params.id});
    if(!lesson){
        res.redirect("/lessons/1/default&all&all")
    }else{

        var tasks = await Task.find({identificator : {$in : lesson.tasks}});
        var results = [];
        var attempts = user.attempts;

        for(var i=0; i < tasks.length; i++){
            var task = tasks[i];
            result = ""
            for(var j = attempts.length-1; j >= 0; j--){
                if( attempts[j].taskID == task.identificator){
                    result = attempts[j].result[attempts[j].result.length - 1][1];
                    if(result == "OK") break;
                }
            }
            if(result=="") result = "-";
            results.push(result)
        }


        res.render('lesson.ejs',{
            ID : lesson.identificator,
            u_login: user.login,
            n_name: user.name,
            login: user.login,
            name: req.user.name,
            title : "Lesson",
            isTeacher: req.user.isTeacher,
            lesson : lesson,
            tasks : tasks,
            results : results,
        })
    }
})

// Delete Lesson Page
app.get('/deletelesson/:id',checkAuthenticated,checkPermission, async (req, res) => {
    var lesson = await Lesson.findOne({identificator: req.params.id}).exec()

    res.render('deletelesson.ejs',{
        login: req.user.login,
        name: req.user.name,
        title : "Delete Lesson",
        isTeacher: req.user.isTeacher,
        lesson: lesson
    })
})

app.post('/deletelesson/:id',checkAuthenticated, checkPermission, async (req, res) => {
    await Lesson.deleteOne({identificator: req.params.id}).exec();

    /* add popup */

    res.redirect('/lessons/1/default&all&all');
})

// Edit Lesson Page
app.get('/editlesson/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var lesson = await Lesson.findOne({identificator: req.params.id}).exec()
    var user = req.user;
    res.render('editlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Lesson",
        isTeacher: req.user.isTeacher,
        lesson: lesson
    })
})

app.post('/editlesson/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;
    var lesson = await Lesson.findOne({identificator: req.params.id}).exec()

    lesson.title = body.title;
    lesson.description = body.description;
    lesson.grade = body.grade;
    lesson.tasks = body.tasks.split(' ');
    await lesson.save();

    res.render('editlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Lesson",
        isTeacher: req.user.isTeacher,
        lesson: lesson
    })
})

// Students List Page
app.get('/students/:page/:search', checkAuthenticated, checkPermission,async (req, res) => {
    var user = req.user;
    var foundStudents = []

    var a = req.params.search.split('&');
    var toSearch = a[0];
    var SearchGrade = a[1];
    var SearchLetter = a[2];
    var students = [];

    if(SearchGrade!="all"){
        students = await User.find({grade: SearchGrade, isTeacher: false}).exec();
    }else{
        students = await User.find({isTeacher: false}).exec();
    }
    if(toSearch == "default") toSearch="";
    for (var i = 0; i < students.length; i++){
        if((students[i].name.slice(0, toSearch.length) == toSearch) && 
        (SearchGrade == 'all' || SearchGrade==students[i].grade) &&
        (SearchLetter == 'all' || SearchLetter == students[i].gradeLetter)){
            foundStudents.push(students[i])
        }
    }

    foundStudents.sort((a,b) => { return a.name > b.name });

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
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    toSearch += '&' + req.body.GradeSelector + 
        '&' + (req.body.gradeLetter || "all")
    res.redirect('/students/' + req.params.page.toString() +'/' + toSearch )
})

// Add News Page
app.get('/addnews',checkAuthenticated,checkPermission, async (req, res) => {
    var user = req.user;
    res.render('addnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add News",
        isTeacher: req.user.isTeacher
    })
})

app.post('/addnews',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;

    await newsAdder.addNews(News, body.title, body.text, body.reference, user.name);

    res.render('addnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add News",
        isTeacher: req.user.isTeacher
    })
})

// Delete News Page
app.get('/deletenews/:id',checkAuthenticated,checkPermission, async (req, res) => {
    var news = await News.findOne({identificator: req.params.id}).exec()

    res.render('deletenews.ejs',{
        login: req.user.login,
        name: req.user.name,
        title : "Delete News",
        isTeacher: req.user.isTeacher,
        news: news
    })
})

app.post('/deletenews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    await News.deleteOne({identificator: req.params.id}).exec();

    /* add popup */

    res.redirect('/');
})

// Edit News Pages
app.get('/editnews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var news = await News.findOne({identificator: req.params.id}).exec()
    var user = req.user;
    res.render('editnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit News",
        isTeacher: req.user.isTeacher,
        news: news
    })
})

app.post('/editnews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;
    var news = await News.findOne({identificator: req.params.id}).exec()

    news.title = body.title;
    news.text = body.text;
    news.reference = body.reference;
    await news.save();

    res.render('editnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit News",
        isTeacher: req.user.isTeacher,
        news: news
    })
})

// Log Out
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})

app.get('*', (req,res) => {
    res.redirect('/');
})


function checkAuthenticated(req, res, next) {
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


function checkValidation(req, res, next) {
    if (req.user.isTeacher || (req.user.login == req.params.login)) {
        return next()
    }
    res.redirect('/account/' + req.user.login + '/1/default&all')
}

// Starting Server
var port = process.env.PORT || 8080
app.listen(port) // port
console.log("Server started at port " + port)