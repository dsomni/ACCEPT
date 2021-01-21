// Connecting Modules
const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const config = require('./config/configs');
const expressLayouts = require('express-ejs-layouts');
const childProcess = require("child_process");
const Adder = require(__dirname + '/public/scripts/Adder.js');
const app = express()

//---------------------------------------------------------------------------------
// MongoDB connecting
var connectionString
if(config.mongodbConfigs.User.Username!="" && config.mongodbConfigs.User.Password!=""){
    connectionString = "mongodb://"+config.mongodbConfigs.User.Username+":"+config.mongodbConfigs.User.Password+"@"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}else{
    connectionString = "mongodb://"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}

mongoose.connect(connectionString,{
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

    grade: Number,
    gradeLetter: String,
    group: String,
    attempts: Array,
    verdicts: Array,

    isTeacher: Boolean
}, {collection: config.mongodbConfigs.CollectionNames.users});

var TaskSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    statement: String,
    examples: Array,
    tests: Array,
    topic: String,
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.tasks});


var LessonSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    description: String,
    tasks: Array,
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.lessons});

var NewsSchema = new mongoose.Schema({
    identificator: Number,
    title : String,
    text: String,
    reference: String,
    date :  String,
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.news});

// Create model from schema
var News = mongoose.model('News', NewsSchema );

// Create model from schema
var Lesson = mongoose.model('Lesson', LessonSchema );

// Create model from schema
var Task = mongoose.model('Task', TaskSchema );

// Create model from schema
var User = mongoose.model('User', UserSchema );

//---------------------------------------------------------------------------------

const initializePassport = require('./config/passport');
initializePassport(
  passport,
  User
)

//---------------------------------------------------------------------------------
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

//---------------------------------------------------------------------------------
// Loading from DB
var news;
var lessons;
async function load(){
    news = await News.find({}).exec();
    lessons = await Lesson.find({}).exec();
}
load()



//---------------------------------------------------------------------------------
// Main Page
app.get('/', async (req, res) => {
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

//---------------------------------------------------------------------------------
// Task Page
app.get('/task/:id', checkAuthenticated, async (req, res) => {
    var problem = await Task.findOne({identificator: req.params.id}).exec()

    fs.stat('public\\processes\\'+req.user.login+'_'+req.params.id, function(err,stats) {
        if (!err) {
            if(Date.now() - stats.birthtimeMs >= config.FolderLifeTime){
                fs.rmdirSync('public\\processes\\'+req.user.login+'_'+req.params.id,{recursive: true});

                res.redirect('/task/'+req.params.id);
            }else{
                fs.stat('public\\processes\\'+req.user.login+'_'+req.params.id+"\\result.txt", async function(err) {
                    if (!err) {

                        var resultStrings = fs.readFileSync('public\\processes\\'+req.user.login+'_'+req.params.id+"\\result.txt","utf-8").trim().split("\n");
                        var codeText = fs.readFileSync('public\\processes\\'+req.user.login+'_'+req.params.id+"\\programText.txt","utf-8").trim();
                        var result = [];
                        for(var i = 0; i < resultStrings.length; i++){
                            result.push(resultStrings[i].split('*'));
                        }
                        result.sort((a,b)=>{
                            return Number(a[0].split('#')[1]) -  Number(b[0].split('#')[1])
                        })

                        let idx = req.user.verdicts.findIndex(item => item.taskID == req.params.id)
                        if(idx==-1){
                            req.user.verdicts.push({
                                taskID: req.params.id,
                                result: result[result.length - 1][1]
                            })
                        } else if(req.user.verdicts[idx]!="OK"){
                            req.user.verdicts[idx] = {
                                taskID: req.params.id,
                                result: result[result.length - 1][1]
                            }
                        }

                        req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
                            programText: codeText, result: result})
                        await req.user.save()

                        fs.rmdirSync('public\\processes\\'+req.user.login+'_'+req.params.id,{recursive: true});

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
            }

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

                fs.mkdirSync('public\\processes\\'+req.user.login+"_"+req.params.id);

                fs.writeFileSync('public\\processes\\'+req.user.login+"_"+req.params.id+"\\programText.txt",req.body.code,"utf-8");

                childProcess.exec('node ' + __dirname + '\\public\\checker\\checker2.js ' +
                __dirname+'\\public\\processes\\'+req.user.login+"_"+req.params.id + " " +
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

    await Adder.addTask(Task, body.title, body.statement, examples, tests, body.topic,body.grade, user.name);

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
    var user = req.user;
    var foundTasks = [];
    var tasks = await Task.find({}).exec();
    var a = req.params.search.split('&');
    toSearch = a[0].toUpperCase();
    SearchTopic = a[1];
    SearchGrade = a[2];
    if(toSearch == "DEFAULT") toSearch="";
    var topics=[];
    var verdict;
    var verdicts = [];
    for (var i = 0; i < tasks.length; i++){
        if(topics.indexOf(tasks[i].topic)==-1){
            topics.push(tasks[i].topic);
        }
        if((tasks[i].title.slice(0, toSearch.length).toUpperCase() == toSearch) && 
        (SearchTopic == 'all' || SearchTopic==tasks[i].topic.replace(" ", "")) && 
        (SearchGrade == 'all' || SearchGrade==tasks[i].grade)){
            foundTasks.push(tasks[i])
            verdict = user.verdicts.find(item => item.taskID == tasks[i].identificator)
            if(verdict){
                verdict = verdict.result
            }else{
                verdict = "-"
            }
            verdicts.push(verdict)
        }
    }
    res.render('tasks.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Tasks List",
        tasks: foundTasks,
        results: verdicts,
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

//---------------------------------------------------------------------------------
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

//---------------------------------------------------------------------------------
// Delete Task
app.post('/deletetask/:id',checkAuthenticated, checkPermission, async (req, res) => {
    
    childProcess.exec("node ./public/scripts/FixAfterDeleteTask.js "+req.params.id)
    res.redirect('/tasks/1/default&all&all')
})

//---------------------------------------------------------------------------------
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
        var toSearch = a[0].toUpperCase();
        var types = a[1];
        if(toSearch == "DEFAULT") toSearch="";

        for(var i = 0; i < attempts.length; i++){
            verylongresult = attempts[i].result[attempts[i].result.length -1 ][attempts[i].result[attempts[i].result.length -1 ].length - 1];
            if((tasks[attempts[i].taskID].title.slice(0, toSearch.length).toUpperCase() == toSearch) &&
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
            n_name: user.name,
            user: user
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

//---------------------------------------------------------------------------------
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
            res.redirect('/account/' + req.user.login + '/1/default&all')
        }

    } else{
        res.redirect('/account/' + req.user.login + '/1/default&all')
    }

})

//---------------------------------------------------------------------------------
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
    let user = req.user;
    let body = req.body;

    let tasks = body.tasks.split(' ');
    let lesson = await Adder.addLesson(Lesson, body.grade, body.title, body.description, tasks, user.name);
    lessons.push(lesson)

    res.render('addlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Add Lesson",
        isTeacher: req.user.isTeacher
    })
})

//---------------------------------------------------------------------------------
// Lessons List Page
app.get('/lessons/:login/:page/:search', checkAuthenticated, async (req, res) => {

    var user;
    if(req.user.login == req.params.login || !req.user.isTeacher){
        user = req.user;
    }else{
        user = await User.findOne({login : req.params.login}).exec();
    }

    var results = [];
    var foundLessons = [];

    var a = req.params.search.split('&');
    var toSearch = a[0].toUpperCase();
    let usedLessons;
    if(user.isTeacher){
        usedLessons = lessons
        SearchGrade = a[1];

    }else{
        SearchGrade = user.grade;
        usedLessons = lessons.filter(item => item.grade==SearchGrade)
    }

    if(toSearch == "DEFAULT") toSearch="";

    var result;
    for (var i = 0; i < usedLessons.length; i++){
        if((usedLessons[i].title.slice(0, toSearch.length).toUpperCase() == toSearch) && 
        (SearchGrade == 'all' || SearchGrade==usedLessons[i].grade)){
            foundLessons.push(usedLessons[i])
            result = "/" + usedLessons[i].tasks.length
            var solved = 0;
            for(var k = 0; k < usedLessons[i].tasks.length; k++){

                let verdict = user.verdicts.find(item => item.taskID == usedLessons[i].tasks[k])
                if(verdict && verdict.result=="OK"){
                    solved+=1
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
    toSearch += '&' + (req.body.GradeSelector || 'all')
    res.redirect('/lessons/'+ req.params.login + '/' + req.params.page.toString() +'/' + toSearch )
})

//---------------------------------------------------------------------------------
// Lesson Page
app.get('/lesson/:login/:id',checkAuthenticated, isAvailable, async (req, res) => {

    var user;
    if(req.user.login == req.params.login){
        user = req.user;
    }else{
        user = await User.findOne({login : req.params.login}).exec();;
    }


    let lesson = lessons.find(item => item.identificator==req.params.id);
    if(!lesson){
        res.redirect("/lessons/"+req.params.login+"/1/default&all&all")
    }else{
        var tasks = await Task.find({identificator : {$in : lesson.tasks}});
        // var tasks = []
        var verdicts = [];
        var verdict;

        for(var i=0; i < tasks.length; i++){
            verdict = user.verdicts.find(item => item.taskID == tasks[i].identificator)
            if(verdict){
                verdict = verdict.result
            }else{
                verdict = "-"
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
    lessons.splice(lessons.findIndex(item => item.identificator==req.params.id),1)
    childProcess.exec("node ./public/scripts/FixAfterDeleteLesson.js "+req.params.id)
    res.redirect('/lessons/0/1/default&all&all');
})

//---------------------------------------------------------------------------------
// Edit Lesson Page
app.get('/editlesson/:id',checkAuthenticated, checkPermission, async (req, res) => {
    let lesson = lessons.find(item => item.identificator==req.params.id);
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
    let lesson = await Lesson.findOne({identificator: req.params.id}).exec()

    lesson.title = body.title;
    lesson.description = body.description;
    lesson.grade = body.grade;
    lesson.tasks = body.tasks.split(' ');
    await lesson.save();

    let idx = lessons.findIndex(item => item.identificator==req.params.id);
    lessons[idx].title = body.title;
    lessons[idx].description = body.description;
    lessons[idx].grade = body.grade;
    lessons[idx].tasks = body.tasks.split(' ');

    res.render('editlesson.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit Lesson",
        isTeacher: req.user.isTeacher,
        lesson: lesson
    })
})

//---------------------------------------------------------------------------------
// Students List Page
app.get('/students/:page/:search', checkAuthenticated, checkPermission,async (req, res) => {
    var user = req.user;
    var foundStudents = []

    var a = req.params.search.split('&');
    var toSearch = a[0].toUpperCase();
    var SearchGrade = a[1];
    var SearchLetter = a[2];
    var SearchGroup = a[3];
    var students = [];

    if(SearchGrade!="all"){
        students = await User.find({grade: SearchGrade, isTeacher: false}).exec();
    }else{
        students = await User.find({isTeacher: false}).exec();
    }
    if(toSearch == "DEFAULT") toSearch="";
    for (var i = 0; i < students.length; i++){
        if((students[i].name.slice(0, toSearch.length).toUpperCase() == toSearch) && 
        (SearchGrade == 'all' || SearchGrade==students[i].grade) &&
        (SearchLetter == 'all' || SearchLetter.toUpperCase() == students[i].gradeLetter.toUpperCase()) &&
        (SearchGroup == 'all' || SearchGroup == students[i].group)){
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

    var new_news = await Adder.addNews(News, body.title, body.text, body.reference, user.name);
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
    var user = req.user;
    res.render('editnews.ejs',{
        login: user.login,
        name: req.user.name,
        title : "Edit News",
        isTeacher: req.user.isTeacher,
        news: one_news
    })
})

app.post('/editnews/:id',checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var body = req.body;
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
// About Page
app.get('/about',checkAuthenticated, async (req, res) => {
    res.render('about.ejs',{
        login: req.user.login,
        name: req.user.name,
        title : "About",
        isTeacher: req.user.isTeacher
    })
})

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
// ???
app.get('/egg1',checkAuthenticated, checkNotPermission, async (req, res) => {
    res.sendFile(__dirname+'/views/20122020.html')
})
app.get('/MazeByMalveetha&Dsomni',checkAuthenticated, checkNotPermission, async (req, res) => {
    res.sendFile(__dirname+'/views/21122020.html')
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
function isAvailable(req, res, next) {
    if (req.user.isTeacher || (req.user.grade == lessons.find(Element => Element.identificator == req.params.id).grade)) {
        return next()
    }
    res.redirect('/lessons/' + req.user.login + '/1/default&all')
}
var max = (a, b)=>{if(a>b)return a;return b}

//---------------------------------------------------------------------------------
// Starting Server
var port = config.port
app.listen(port) // port
console.log("Server started at port " + port)