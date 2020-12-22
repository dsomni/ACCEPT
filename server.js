// Connecting Modules
const express = require('express')
const app = express()
const checker = require(__dirname + '\\public\\checker\\checker.js');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
const config = require('./config/db');
const account = require('./routes/account');

// Settings
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use('/public',express.static('public')); //where search for static files
app.use(cors());
app.use(bodyParser.json())

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


// Main Page
app.get('/', (req, res) => {
    res.render('main.ejs');
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

app.use('/account', account);

// Starting Server
app.listen(3000) // port
console.log("Server started at port 3000")