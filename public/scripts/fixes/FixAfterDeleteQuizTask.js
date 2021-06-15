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

    let lesson;
    for (let i = 0; i < quiz.lessons.length; i++) {
        lesson = quiz.lessons[i];
        lesson.attempts.filter(item => item.TaskID != deletedTask);
        for (let j = 0; j < lesson.attempts.length; j++) {
            if (parseInt(lesson.attempts[j].TaskID.split('_')[1]) > parseInt(deletedTask.split('_')[1]))
                lesson.attempts[j].TaskID = "Q" + QuizID + '_' + (parseInt(lesson.attempts[j].TaskID.split('_')[1]) - 1);
        }

        let _id = parseInt(deletedTask.split('_')[1]);
        for (let j = 0; j < lesson.results.length; j++) {
            if(_id<lesson.results[j].tasks.length){
                lesson.results[j].sumscore -= lesson.results[j].tasks[_id].score;
                lesson.results[j].tasks.splice(_id, 1);
            }
        }
    }

    quiz.markModified('lessons');
    quiz.markModified('tasks');
    await quiz.save();
}

run()

setTimeout(() => {
    process.exit()
}, 10000)