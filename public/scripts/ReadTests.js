const unzipper = require("unzipper");
const mongoose = require('mongoose');
const fs = require("fs");
const config = require('../../config/configs');
const Task = require("../../config/models/Task");

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


let filepath = process.argv[2];
let taskId = process.argv[3];
console.log(filepath);
async function go() {
    let files = filepath.split("/").slice(0, -1).join("/") + "/" + Date.now();
    fs.mkdirSync(files);
    console.log(files);
    fs.createReadStream(filepath).pipe(unzipper.Extract({ path: files }));
    fs.rm(filepath, err => {
        if(err) throw err
    });
    fs.readdir(files, (err, tests) => {
        console.log(tests);
    });
    // let task = await Task.findOne({ identificator: taskId }).exec();
}
setTimeout(go, 1000);