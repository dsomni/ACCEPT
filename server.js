// Connecting Modules
const express = require('express')
const checker = require(__dirname + '/public/checker/checker.js');
const mongoose = require('mongoose');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const config = require('./config/db');
const expressLayouts = require('express-ejs-layouts');
const taskAdder = require(__dirname + '/public/scripts/addTask.js');
const app = express()

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
    attempts: Array,

    isTeacher: Boolean,
    hasClasses: Array
}, {collection: 'users'});

var TaskSchema = new mongoose.Schema({
    identificator: Number,
    title : String,
    statement: String,
    examples: Array,
    tests: Array,
    topic: String,
    author: String

}, {collection: 'tasks'});

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
app.get('/', (req, res) => {
    if(req.user){
        res.render('main.ejs',{name : req.user.name,
        title: "Main Page",
        isTeacher: req.user.isTeacher});
    }else{
        res.render('main.ejs',{name : "",
            title: "Main Page",
            isTeacher: false
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
    res.render('task.ejs',{RESULT: result,
        ID: req.params.id,
        name: req.user.name, 
        title: "Task " + req.params.id,
        isTeacher: req.user.isTeacher,
        problem: problem,
        prevCode: prevCode
    });  

})

// Task Page listener
app.post('/task/:id',checkAuthenticated, async (req, res) => {
    var prevCode = ""
    var result="";
    var attempts = req.user.attempts;
    var problem = await Task.findOne({identificator: req.params.id}).exec()
    for(var i = 0; i < attempts.length; i++){
        if( attempts[i].taskID == req.params.id){
            prevCode = attempts[i].programText;
            result =attempts[i].result;
            break;
        }
    }
    if(prevCode == "" || prevCode != req.body.code ){
        var result = await checker.parser(Task, req.body.code, req.params.id);
        req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
            programText: req.body.code, result: result})
        req.user.save()
    }
    res.render('task.ejs', {RESULT: result, 
        ID: req.params.id, 
        name: req.user.name,
        title: "Task " + req.params.id,
        isTeacher: req.user.isTeacher,
        problem: problem,
        prevCode: prevCode
    })
})

// Account Page
app.get('/account',checkAuthenticated, async (req, res) => {
    var user = req.user;
    res.render('account.ejs',{name: user.name,
        title : "Account",
        isTeacher: req.user.isTeacher
    })
})


// Add Task Page
app.get('/addtask',checkPermission, async (req, res) => {
    var user = req.user;
    res.render('addtask.ejs',{name: user.name,
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

    await taskAdder.addTask(Task, body.title, body.statement, examples, tests, body.topic, user.name);

    res.render('addtask.ejs',{name: user.name,
        title : "Add Task",
        isTeacher: req.user.isTeacher
    })
})

// Tasks List Page
app.get('/tasks', checkAuthenticated, async (req, res) => {
    var user = req.user;
    var tasks = await Task.find({}).exec();
    var attempts = req.user.attempts;
    var results = [];
    for (var i = 0; i < tasks.length; i++){
        results.push("-")
    }
    for (var i = 0; i < tasks.length; i++){
        for(var j = attempts.length-1; j >= 0; j--){
            if( attempts[j].taskID == i){
                results[i]=attempts[j].result[attempts[j].result.length - 1][1];
                if(results[i] == "OK") break;
            }
        }
    }
    res.render('tasks.ejs',{name: user.name,
        title : "Tasks List",
        tasks: tasks,
        results: results,
        isTeacher: req.user.isTeacher
    })
})

// Edit Task Page
app.get('/edittask/:id',checkPermission, async (req, res) => {
    var problem = await Task.findOne({identificator: req.params.id}).exec()
    var user = req.user;
    res.render('edittask.ejs',{name: user.name,
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

    //await taskAdder.addTask(Task, body.title, body.statement, examples, tests, body.topic, user.name);
    problem.title = body.title;
    problem.statement = body.statement;
    problem.topic = body.topic;
    problem.examples = examples;
    problem.tests = tests;
    await problem.save();
    res.render('edittask.ejs',{name: user.name,
        title : "Edit Task",
        isTeacher: req.user.isTeacher,
        problem: problem
    })
})

// Log Out
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
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

// Starting Server
app.listen(3000) // port
console.log("Server started at port 3000")