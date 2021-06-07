const mongoose = require('mongoose');
const config = require('../../../config/configs');
const childProcess = require("child_process");
const path = require('path')

let connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
  connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
  connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})

const Quiz = require('../../../config/models/Quiz');

let to_check_end = [];
let now;

async function checkEnd() {
  now = new Date();
  let b = false;
  let lesson, quiz;
  console.log(to_check_end);
  for (let i = 0; i < to_check_end.length; i++) {
    obj = to_check_end[i];
    quiz = obj.quiz;
    if (obj.lessonsGrades.length > 0) {
      for (let j = 0; j < obj.lessonsGrades.length; j++) {
        lessonIndex = quiz.lessons.findIndex(item => item.grade == obj.lessonsGrades[j]);
        if (lessonIndex == -1)
          break
        lesson = quiz.lessons[lessonIndex];
        if (now - Date.parse(lesson.whenEnds) >= 0) {
          b = true;
          lesson.isEnded = true;
          quiz.lessons[lessonIndex] = lesson;
        }
      }
      quiz.markModified("lessons");
    } else {
      quiz.hasActiveLesson = false;
      quiz.markModified("hasActiveLesson");
    }
    await quiz.save();
  }
  if (b) {
    fillTo_check_end();
  }
}

async function fillTo_check_end() {
  to_check_end_quizzes = await Quiz.find({ hasActiveLesson : true}).exec();
  to_check_end = [];
  let obj;
  to_check_end_quizzes.forEach(quiz => {
    obj = {
      quiz,
      lessonsGrades: []
    }
    for (let i = 0; i < quiz.lessons.length; i++) {
      if (!quiz.lessons[i].isEnded) {
        obj.lessonsGrades.push(quiz.lessons[i].grade);
      }
    }
    to_check_end.push(obj);
  })
}

fillTo_check_end();
checkEnd();

setInterval(() => {
  checkEnd();
}, 1000)

setInterval(() => {
  fillTo_check_end();
}, 5 * 1000)

setTimeout(() => {
  process.exit();
}, 1000 * 60 * 10)
