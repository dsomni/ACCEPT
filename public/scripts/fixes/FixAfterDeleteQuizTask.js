const mongoose = require('mongoose');
const config = require('../../../config/configs');

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

const Quiz = require('../../../config/models/Quiz');

var deletedTask = process.argv[3];
var QuizID = process.argv[2];
async function run() {
    let quiz = await Quiz.findOne({ identificator: QuizID }).exec();

    let deleted = quiz.tasks.findIndex(item => item.identificator == deletedTask)
    quiz.tasks.splice(deleted, 1);
    for (let i = 0; i < quiz.tasks.length; i++) {
        if (parseInt(quiz.tasks[i].identificator.split('_')[1]) > parseInt(deletedTask.split('_')[1]))
            quiz.tasks[i].identificator = "Q" + QuizID + '_' + (parseInt(quiz.tasks[i].identificator.split('_')[1]) - 1);
    };

    quiz.markModified('tasks');
    await quiz.save();
}

run()

setTimeout(() => {
    process.exit()
}, 10000)