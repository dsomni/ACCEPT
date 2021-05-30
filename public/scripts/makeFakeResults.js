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
    let tournament = await Tournament.findById("60ad0080b6828936875c3b50");
    tournament.results.push({
        login: "qt9FbItN",
        sumscore: 123,
        sumtime: 123124,//sum from start
        tasks: [{
            score: 100,
            dtime: 123123,//from start
            tries: 3,
            attempts: [{
                date: "123123",
                score: "100"
            }, {
                date: "123123",
                score: "90"
            }, {
                date: "123113",
                score: "RE"
            }]
        }, {
            score: 90,
            dtime: 123123,//from start
            tries: 3,
            attempts: [{
                date: "123123",
                score: "90"
            }, {
                date: "123123",
                score: "90"
            }, {
                date: "123113",
                score: "RE"
            }]
        }, {
            score: 80,
            dtime: 123123,//from start
            tries: 3,
            attempts: [{
                date: "123123",
                score: "80"
            }, {
                date: "123123",
                score: "30"
            }, {
                date: "123113",
                score: "RE"
            }]
            }]
    });
    tournament.save();
}
go();

setTimeout(() => {
    process.exit()
}, 1000)