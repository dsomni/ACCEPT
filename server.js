const express = require('express')
const fs = require('fs')
const app = express()
const childProcess = require('child_process');

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use('/public',express.static('public')); //where search for static files


app.get('/task/:id', (req, res) => {
    res.render('task.ejs',{RESULT: '', ID: req.params.id});
})

app.post('/task/:id', async (req, res) => {
    fs.writeFileSync('public/checker/programText.txt', req.body.code)
    fs.writeFileSync('public/checker/meta.txt', req.params.id)
    var path = childProcess.execSync('node ' + __dirname+'/public/checker/checker.js').toString();
    console.log(path.trim())
    res.render('task.ejs', {RESULT: path.trim(), ID: req.params.id})
})

app.get('/', (req, res) => {
    res.render('main.ejs');
})

app.listen(3000)
console.log("Server started at port 3000")