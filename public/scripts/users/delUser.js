const xlsx = require('node-xlsx').default;
const bcrypt = require('bcryptjs');
const childProcess = require("child_process");
const path = require('path');
const fs = require('fs');

var tablePath = process.argv[2];

const User = require('../../../config/models/User');

var d = 10;

async function toDo() {

    const workSheetsFromFile = await xlsx.parse(tablePath);
    var data = workSheetsFromFile[0].data
    d = data.length;
    var student;
    for (var i = 1; i < data.length; i++) {
        student = data[i];
        if (student.length == 0)
            break;
        console.log(`node ${path.join(__dirname, '../fixes/FixAfterDeleteUser.js')} ${student[0]} ${1}`)
        childProcess.execSync(`node ${path.join(__dirname, '../fixes/FixAfterDeleteUser.js')} ${student[0]} ${1}`)
    }
    fs.rmSync(tablePath)
}

toDo()

setTimeout(() => {
    process.exit()``
}, 1000*d);