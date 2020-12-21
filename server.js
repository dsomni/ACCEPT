// Connecting Modules
const express = require('express')
const app = express()
const checker = require(__dirname + '\\public\\checker\\checker.js');

// Settings
app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use('/public',express.static('public')); //where search for static files


// Task Page
app.get('/task/:id', (req, res) => {
    res.render('task.ejs',{RESULT: [], ID: req.params.id});
})

// Task Page listener
app.post('/task/:id', async (req, res) => {
    var result = checker.parser(req.body.code, req.params.id);
    res.render('task.ejs', {RESULT: result, ID: req.params.id})
})

// Main Page
app.get('/', (req, res) => {
    res.render('main.ejs');
})

// Starting Server
app.listen(3000) // port
console.log("Server started at port 3000")