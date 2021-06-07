const mongoose = require('mongoose');
const config = require('../../../config/configs');

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

const Quiz = require('../../../config/models/Quiz');

var deletedQuiz = parseInt(process.argv[2]);

async function run() {
  await Quiz.deleteOne({ identificator: deletedQuiz })
  let quizzes = await Quiz.find({});
  for (let i = 0; i < quizzes.length; i++) {
    if (quizzes[i].identificator > deletedQuiz) {
      quizzes[i].identificator -= 1;
      await quizzes[i].save();
    }
  }
}

run();
setTimeout(() => {
  process.exit()
}, 10000)