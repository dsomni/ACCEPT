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
        res.render('main.ejs',{
            login: req.user.login,
            name : req.user.name,
            title: "Main Page",
            isTeacher: req.user.isTeacher
    });
    }else{
        res.render('main.ejs',{
            login: "",
            name : "",
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

        toSearch = req.params.search;
        if(toSearch == "default") toSearch="";


        for(var i = 0; i < attempts.length; i++){
            if(tasks[attempts[i].taskID].title.slice(0, toSearch.length) == toSearch){
                foundAttempts.push(attempts[i]);
                foundTasks.push(tasks[attempts[i].taskID]);
            }
        }

        res.render('account.ejs',{
            login: user.login,
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
        res.redirect('/account/' + req.user.login + '/1/default')
    }
})

app.post('/account/:login/:page/:search', checkAuthenticated, checkValidation, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
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

    await taskAdder.addTask(Task, body.title, body.statement, examples, tests, body.topic, user.name);

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
    var tasks = await Task.find({}).exec();
    var attempts = req.user.attempts;
    var results = [];
    var foundTasks = [];

    toSearch = req.params.search;
    if(toSearch == "default") toSearch="";

    var result;
    for (var i = 0; i < tasks.length; i++){
        if(tasks[i].title.slice(0, toSearch.length) == toSearch){
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
        search: req.params.search
    })
})

app.post('/tasks/:page/:search', checkAuthenticated, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
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

// Delte Task Page
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

    res.redirect('/tasks/1/default');
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
            res.redirect('/account/' + req.user.login + '/1/default')
        }

    } else{
        console.log(2)
        res.redirect('/account/' + req.user.login + '/1/default')
    }

})

// All Attempts Page
app.get('/allattempts/:page/:search/:flag', checkAuthenticated, checkPermission, async (req, res) => {
    var user = req.user;
    var tasks = await Task.find({}).exec();
    var attempts = req.user.attempts;
    var results = [];
    var foundTasks = [];

    toSearch = req.params.search;
    if(toSearch == "default") toSearch="";

    var result;
    for (var i = 0; i < tasks.length; i++){
        if(tasks[i].title.slice(0, toSearch.length) == toSearch){
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

    res.render('allattempts.ejs',{
        login: user.login,
        name: req.user.name,
        title : "All Attempts",
        tasks: foundTasks,
        results: results,
        isTeacher: req.user.isTeacher,
        page: req.params.page,
        search: req.params.search
    })
})

app.post('/allattempts/:page/:search/:flag', checkAuthenticated, checkPermission, async (req, res) => {
    var toSearch = req.body.searcharea;
    if(!toSearch) toSearch = "default";
    res.redirect('/allattempts/' + req.params.page.toString() +'/' + toSearch )
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
    res.redirect('/account/' + req.user.login + '/1/default')
}

// Starting Server
var port = process.env.PORT || 8080
app.listen(port) // port
console.log("Server started at port " + port)