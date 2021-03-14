const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const Task = require('../../config/models/Task');

async function run() {

    //-----------------------------------------------------------------
    // Repair Hints
    let tasks = await Task.find({}).exec()
    for (let i = 0; i < tasks.length; i++) {
        let task = tasks[i];
        if (!task.identificator.split('_')[1]) {
            task.identificator = '0_' + task.identificator;
            await task.save();
        }
    }
}

run()

setTimeout(() => {
    process.exit()
}, 10000)