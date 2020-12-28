// Connecting Modules
const express = require('express')
const app = express()
const checker = require(__dirname + '\\public\\checker\\checker.js');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
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


var UserSchema = new mongoose.Schema({
    login: String,
    password: String
});

// Компилируем модель из схемы
var User = mongoose.model('User', UserSchema );

const addUser = async function (login,password){
    const hashedPassword = await bcrypt.hash(password, 10)
    User.insertMany([{
        login: login,
        password: hashedPassword
    }])
}
//addUser('96','1')
//addUser('97','2')

const initializePassport = require('./config/passport')
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
    res.render('main.ejs',{login : req.user.login});
})

// Task Page
app.get('/task/:id', (req, res) => {
    res.render('task.ejs',{RESULT: [], ID: req.params.id});
})

// Task Page listener
app.post('/task/:id', async (req, res) => {
    var result = checker.parser(req.body.code, req.params.id);
    res.render('task.ejs', {RESULT: result, ID: req.params.id})
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