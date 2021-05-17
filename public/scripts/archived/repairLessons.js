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

const Lesson = require('../../config/models/Lesson');

async function run() {

    let lessons = await Lesson.find({}).exec()
    for (let i = 0; i < lessons.length; i++) {
        let lesson = lessons[i];
        for (let j = 0; j < lesson.tasks.length; j++){
            if (!String(lesson.tasks[j]).includes('_')) {
                lesson.tasks[j] = '0_' + lesson.tasks[j];
            }
        }
        lesson.markModified('tasks')
        await lesson.save();
    }
}

run().then(() => { console.log("Done"); process.exit() });