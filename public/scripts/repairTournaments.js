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

const Tournament = require('../../config/models/Tournament');

async function go() {
    let tournaments = await Tournament.find({}).exec();
    for (let i = 0; i < tournaments.length; i++){
        tournaments[i].results.forEach(item => item.tasks.forEach(task => task.attempts = []));
        tournaments[i].frozenResults.forEach(item => item.tasks.forEach(task => task.attempts = []));
        tournaments[i].markModified("results")
        tournaments[i].markModified("frozenResults")
        tournaments[i].save();
    }
}
go();

setTimeout(() => {
    process.exit()
}, 10000)