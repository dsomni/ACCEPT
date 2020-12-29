// Connecting Modules
const express = require('express')
const app = express()
const checker = require(__dirname + '\\public\\checker\\checker.js');
const mongoose = require('mongoose');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const config = require('./config/db');

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
});


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
app.get('/', checkAuthenticated, (req, res) => {
    res.render('main.ejs',{name : req.user.name});
})

// Task Page
app.get('/task/:id', (req, res) => {
    if(req.user.attempts.length == 0){
        res.render('task.ejs',{RESULT: [], ID: req.params.id, name: req.user.name});  
    }else{
        res.render('task.ejs',{RESULT: req.user.attempts[0].result, ID: req.params.id, name: req.user.name});  
    }

})

// Task Page listener
app.post('/task/:id', async (req, res) => {
    if(req.user.attempts.length == 0 || req.user.attempts[0].programText!=req.body.code){
        var result = checker.parser(req.body.code, req.params.id);
        req.user.attempts.unshift({taskID: req.params.id, date: Date.now().toString(),
            programText: req.body.code, result: result})
        req.user.save()
    }else{
        var result = req.user.attempts[0].result
    }
    res.render('task.ejs', {RESULT: result, ID: req.params.id, name: req.user.name})
})

// Log In
app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})
  
app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}), checkAuthenticated)

// Log Out
app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
}

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

// Starting Server
app.listen(3000) // port
console.log("Server started at port 3000")