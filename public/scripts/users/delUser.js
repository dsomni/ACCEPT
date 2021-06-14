const xlsx = require('node-xlsx').default;
const bcrypt = require('bcryptjs');
const childProcess = require("child_process");
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('../../../config/configs');

var tablePath = process.argv[2];

var connectionString;
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
};

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

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
        if (await User.exists({ login: student[0] })) {
            childProcess.execSync(`node ${path.join(__dirname, '../fixes/FixAfterDeleteUser.js')} ${student[0]} ${1}`)
        }
    }
    fs.rmSync(tablePath);
    process.exit()
}

toDo()

// setTimeout(() => {
//     process.exit()``
// }, 2000*d);