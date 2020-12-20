const express = require('express')
const fs = require('fs')
const app = express()

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(express.static(__dirname+"/views"))

app.get('/', (req, res) => {
    res.render('index.ejs')
})

app.post('/', async (req, res) => {
    fs.writeFileSync('program.txt', req.body.code)
    console.log(req.body.code)
    res.render('index.ejs')
})

app.listen(3000)