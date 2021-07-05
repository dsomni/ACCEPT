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
const Tournament = require('../../../config/models/Tournament');
const User = require('../../../config/models/User');

var deletedLogin = process.argv[2];
var permanently = Number.parseInt(process.argv[3]);
async function run() {

    let user = await User.findOne({ login: deletedLogin }).exec();
    if (!user)
        return;

    let tournaments = await Tournament.find({});
    for (let j = 0; j < tournaments.length; j++) {
        let tournament = tournaments[j];
        tournament.results = tournament.results.filter(item => item.login != deletedLogin);
        tournament.frozenResults = tournament.frozenResults.filter(item => item.login != deletedLogin);
        tournament.attempts = tournament.attempts.filter(item => item.login != deletedLogin);
        tournament.markModified('results');
        tournament.markModified('frozenResults');
        tournament.markModified('attempts');
        await tournament.save();
    }

    let quizzes = await Quiz.find({});
    let lesson, quiz, lessonIdx;
    let grade = user.isTeacher ? 'teacher' : user.grade + user.gradeLetter
    for (let i = 0; i < quizzes.length; i++) {
        quiz = quizzes[i];
        lessonIdx = quiz.lessons.findIndex(item => item.grade.toLowerCase() == grade.toLowerCase());
        if(lessonIdx<0)
            break;
        lesson = quiz.lessons[lessonIdx];
        lesson.attempts = lesson.attempts.filter(item => item.login != deletedLogin);
        lesson.results = lesson.results.filter(item => item.login != deletedLogin);

        quiz.lessons[lessonIdx] = lesson;
        quiz.markModified("lessons");
        await quiz.save();
    }

    user.attempts = [];
    user.verdicts = [];
    user.markModified('attempts');
    user.markModified('verdicts');
    await user.save();

    if (permanently) {
        await User.deleteOne({ login: deletedLogin });
    }
    process.exit();
}

run()

setTimeout(() => {
    process.exit()
}, 10000)