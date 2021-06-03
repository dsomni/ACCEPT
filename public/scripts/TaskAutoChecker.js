const mongoose = require('mongoose');
const config = require('../../config/configs');
const path = require('path')
const fs = require('fs')

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

const Task = require('../../config/models/Task');
const User = require('../../config/models/User');
const Tournament = require('../../config/models/Tournament');
const Quiz = require('../../config/models/Quiz');

var isBusy = false;

async function check() {
  if (!isBusy) {
    isBusy = true;

    let processesPath = path.normalize(__dirname + "\\..\\processes");

    let files = await fs.readdirSync(processesPath);
    for (let i = 0; i < files.length; i++) {
      let filename = files[i];
      let folderPath = path.normalize(processesPath + '\\' + filename);
      let info = filename.split('_')
      if (info.length != 3) {
        try {
          fs.rmdirSync(folderPath, { recursive: true });
        }
        catch (err) {
          try {
            fs.unlinkSync(path);
          }
          catch (err2) {
            console.log(err2)
          }
        }
        break;
      }
      let user_login = info[0];
      let tournament_id = info[1];
      let task_id = info[2];
      let full_id = tournament_id + "_" + task_id;

      let user = await User.findOne({ login: user_login }).exec();

      if (tournament_id == "0") {
        let task = await Task.findOne({ identificator: full_id }).exec();
        fs.stat(folderPath, function (err, stats) {
          if (!err) {
            fs.stat(path.join(folderPath + "\\result.txt"), async function (err, stats2) {
              if (!err) {
                let resultStrings = fs.readFileSync(path.normalize(folderPath + "\\result.txt"), "utf-8").trim().split("\n");
                if (resultStrings[0].length > 0 && (resultStrings[0] == 'Test #1*Compilation Error*er' || resultStrings.length == task.tests.length)) {

                  let result = [];
                  for (let i = 0; i < resultStrings.length; i++) {
                    result.push(resultStrings[i].split('*'));
                  }
                  result.sort((a, b) => {
                    return Number(a[0].split('#')[1]) - Number(b[0].split('#')[1])
                  })

                  let idx = user.verdicts.findIndex(item => item.taskID == full_id)
                  if (idx == -1) {
                    user.verdicts.push({
                      taskID: full_id,
                      result: getVerdict(result)
                    })
                  } else if (user.verdicts[idx].result != "OK") {
                    user.verdicts.splice(idx, 1);
                    user.verdicts.push({
                      taskID: full_id,
                      result: getVerdict(result)
                    })
                  }

                  idx = max(0, user.attempts.findIndex(item => item.taskID == full_id));
                  let obj = user.attempts[idx];
                  user.attempts.splice(idx, 1, {
                    taskID: obj.taskID,
                    date: obj.date,
                    programText: obj.programText,
                    result: result,
                    language: obj.language
                  })
                  await user.save()

                  fs.rmdirSync(folderPath, { recursive: true });
                }
              } else if (Date.now() - stats.birthtimeMs >= config.FolderLifeTime) {
                fs.rmdirSync(folderPath, { recursive: true });
              }
            });
          }
        });
      } else if (tournament_id[0]!="Q") {
        let tournament = await Tournament.findOne({ identificator: tournament_id }).exec();

        let task = tournament.tasks.find(item => item.identificator == full_id);

        fs.stat(folderPath, function (err, stats) {
          if (!err && Date.now()) {
            fs.stat(path.normalize(folderPath + "\\result.txt"), async function (err, stats2) {
              if (!err) {
                let resultStrings = fs.readFileSync(path.normalize(folderPath + "\\result.txt"), "utf-8").trim().split("\n");
                if (resultStrings[0].length > 0 && (resultStrings[0] == 'Test #1*Compilation Error*er' || resultStrings.length == task.tests.length)) {

                  let result = [];
                  for (let i = 0; i < resultStrings.length; i++) {
                    result.push(resultStrings[i].split('*'));
                  }
                  result.sort((a, b) => {
                    return Number(a[0].split('#')[1]) - Number(b[0].split('#')[1])
                  })

                  let idx = user.verdicts.findIndex(item => item.taskID == full_id)
                  if (idx == -1) {
                    user.verdicts.push({
                      taskID: full_id,
                      result: getVerdict(result)
                    })
                  } else if (user.verdicts[idx].result != "OK") {
                    user.verdicts.splice(idx, 1);
                    user.verdicts.push({
                      taskID: full_id,
                      result: getVerdict(result)
                    })
                  }

                  idx = max(0, user.attempts.findIndex(item => item.taskID == full_id));
                  let obj = user.attempts[idx];
                  user.attempts.splice(idx, 1, {
                    taskID: obj.taskID,
                    date: obj.date,
                    programText: obj.programText,
                    result: result,
                    language: obj.language
                  })
                  await user.save()

                  let score = getScore(result);
                  if (score != 100 && tournament.allOrNothing) {
                    score = 0;
                  }
                  tournament.attempts.push({
                    login: user.login,
                    AttemptDate: obj.date,
                    TaskID: full_id,
                    score
                  });

                  // tournament results update
                  let user_result_idx = tournament.results.findIndex(item => item.login == user.login.toString());
                  if (!tournament.isEnded && user_result_idx != -1 && task_id >= tournament.results[user_result_idx].tasks.length) {
                    while (tournament.results[user_result_idx].tasks.length <= task_id) {
                      tournament.results[user_result_idx].tasks.push({
                        score: 0,
                        dtime: 0,
                        tries: 0,
                        attempts: []
                      })
                    }
                  }
                  if (!tournament.isEnded && user_result_idx != -1 && tournament.results[user_result_idx].tasks[task_id].score != 100) {
                    tournament.results[user_result_idx].tasks[task_id].tries += 1;
                    tournament.results[user_result_idx].tasks[task_id].attempts.push({ date: obj.date, score });
                    if (score != 100)
                      tournament.results[user_result_idx].sumtime += tournament.penalty;
                    if (tournament.results[user_result_idx].tasks[task_id].score < score) {
                      tournament.results[user_result_idx].sumscore -= tournament.results[user_result_idx].tasks[task_id].score;
                      tournament.results[user_result_idx].sumscore += score;
                      tournament.results[user_result_idx].tasks[task_id].score = score;

                      let now = new Date();
                      tournament.results[user_result_idx].sumtime -= tournament.results[user_result_idx].tasks[task_id].dtime;
                      tournament.results[user_result_idx].sumtime += now - Date.parse(tournament.whenStarts);
                      tournament.results[user_result_idx].tasks[task_id].dtime = now - Date.parse(tournament.whenStarts);

                    }
                  }
                  tournament.markModified("results");
                  await tournament.save()

                  fs.rmdirSync(folderPath, { recursive: true });
                }
              } else if (Date.now() - stats.birthtimeMs >= config.FolderLifeTime) {
                fs.rmdirSync(path.normalize(folderPath), { recursive: true });
              }
            });
          }
        });
      }else{
        let quiz_id = tournament_id.slice(1);
        let quiz = await Quiz.findOne({ identificator: quiz_id }).exec();
        let grade = user.isTeacher ? 'teacher' : user.grade + user.gradeLatter;
        let lesson = quiz.lessons.find(item => item.grade == grade);

        let task = quiz.tasks.find(item => item.identificator == full_id);

        fs.stat(folderPath, function (err, stats) {
          if (!err && Date.now()) {
            fs.stat(path.normalize(folderPath + "\\result.txt"), async function (err, stats2) {
              if (!err) {
                let resultStrings = fs.readFileSync(path.normalize(folderPath + "\\result.txt"), "utf-8").trim().split("\n");
                if (resultStrings[0].length > 0 && (resultStrings[0] == 'Test #1*Compilation Error*er' || resultStrings.length == task.tests.length)) {
                  let result = [];
                  for (let i = 0; i < resultStrings.length; i++) {
                    result.push(resultStrings[i].split('*'));
                  }
                  result.sort((a, b) => {
                    return Number(a[0].split('#')[1]) - Number(b[0].split('#')[1])
                  })
                  // let idx = user.verdicts.findIndex(item => item.taskID == full_id)
                  // if (idx == -1) {
                  //   user.verdicts.push({
                  //     taskID: full_id,
                  //     result: getVerdict(result)
                  //   })
                  // } else if (user.verdicts[idx].result != "OK") {
                  //   user.verdicts.splice(idx, 1);
                  //   user.verdicts.push({
                  //     taskID: full_id,
                  //     result: getVerdict(result)
                  //   })
                  // }
                  let score = getScore(result);

                  idx = max(0 ,lesson.attempts.findIndex(item => item.TaskID == full_id));
                  let obj = lesson.attempts[idx];
                  obj.result = result;
                  obj.score = score;
                  lesson.attempts[idx] = obj;
                  // await lesson.save()


                  // lesson lesson results update
                  let lesson_result_idx = lesson.results.findIndex(item => item.login == user.login);
                  if (lesson_result_idx == -1) {
                    lesson.results.push({
                      login: user.login,
                      sumscore: 0,
                      tasks: []
                    });
                    lesson_result_idx = lesson.results.findIndex(item => item.login == user.login);
                  }
                  if ((!lesson.isEnded || user.isTeacher) && lesson_result_idx != -1 && task_id >= lesson.results[lesson_result_idx].tasks.length) {
                    while (lesson.results[lesson_result_idx].tasks.length <= task_id) {
                      lesson.results[lesson_result_idx].tasks.push({
                        score: 0,
                        tries: 0,
                        attempts: []
                      })
                    }
                  }
                  if ((!lesson.isEnded || user.isTeacher)  && lesson_result_idx != -1 && lesson.results[lesson_result_idx].tasks[task_id].score != 100) {
                    lesson.results[lesson_result_idx].tasks[task_id].tries += 1;
                    lesson.results[lesson_result_idx].tasks[task_id].attempts.push({ date: obj.date, score });
                    if (lesson.results[lesson_result_idx].tasks[task_id].score < score) {
                      lesson.results[lesson_result_idx].sumscore -= lesson.results[lesson_result_idx].tasks[task_id].score;
                      lesson.results[lesson_result_idx].sumscore += score;
                      lesson.results[lesson_result_idx].tasks[task_id].score = score;
                    }
                  }

                  idx = quiz.lessons.findIndex(item => item.grade == grade);
                  quiz.lessons.splice(idx, 1, lesson);
                  quiz.markModified("lessons");
                  await quiz.save()

                  fs.rmdirSync(folderPath, { recursive: true });
                }
              } else if (Date.now() - stats.birthtimeMs >= config.FolderLifeTime) {
                fs.rmdirSync(path.normalize(folderPath), { recursive: true });
              }
            });
          }
        });
      }
    }
    isBusy = false;
  }

}

function getVerdict(results) {
  for (let i = 0; i < results.length; i++) {
    if (results[i][1] != "OK") {
      return results[i][1].split(" ").slice(0, 2).map(item => item[0].toUpperCase()).join('');
    }
  }
  if (results.length > 0)
    return "OK";
  return 'err';
}

function getScore(results) {
  return Math.ceil(results.filter(item => item[2] == "ok").length / results.length * 100)
}

let max = (a, b) => { if (a > b) return a; return b };

check();

setInterval(() => {
  check();
}, 2000)

setTimeout(() => {
  process.exit();
}, 1000 * 60 * 10)