const mongoose = require('mongoose');
const config = require('../../config/configs');
const childProcess = require("child_process");
const path = require('path');

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
const News = require('../../config/models/News');

async function run() {
    mongoose.connection.collections[config.mongodbConfigs.CollectionNames.users].drop( function(err) {
        console.log('collection \"users\" dropped');
    });
    mongoose.connection.collections[config.mongodbConfigs.CollectionNames.news].drop( function(err) {
        console.log('collection \"news\" dropped');
    });
    mongoose.connection.collections[config.mongodbConfigs.CollectionNames.tournaments].drop( function(err) {
        console.log('collection \"tournaments\" dropped');
    });
    childProcess.exec('node '+ path.join(__dirname, 'repairLessons.js'));
    childProcess.exec('node '+ path.join(__dirname, 'repairTasks.js'));
    childProcess.exec('node '+ path.join(__dirname, 'addTeacher.js'));
    childProcess.exec('node '+ path.join(__dirname, 'addUser.js'));
}

run();

setTimeout(() => {
    process.exit();
}, 5000);