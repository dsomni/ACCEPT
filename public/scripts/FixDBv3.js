const mongoose = require('mongoose');
const config = require('../../config/configs');
const childProcess = require("child_process");

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

const User = require('../../config/models/User');

async function run() {
    mongoose.connection.collections['users'].drop( function(err) {
        console.log('collection dropped');
    });
    childProcess.exec('node repairLessons.js');
    childProcess.exec('node repairTasks.js');
    childProcess.exec('node addUser.js');
    childProcess.exec('node addTeacher.js');
}

run()

setTimeout(() => {
    process.exit()
}, 10000)