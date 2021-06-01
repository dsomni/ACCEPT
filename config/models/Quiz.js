const mongoose = require('mongoose')
const config = require('../configs');

const QuizSchema = new mongoose.Schema({
  identificator: Number,
  title: String,
  description: String,
  tamplate: Boolean,//When start quiz create copy
  grade: String,
  tasks: [{
    identificator: String,
    author: String,
    title: String,
    statement: String,
    input: String,
    output: String,
    examples: Array,
    tests: Array,
  }],
  author: String,
  duration: Number,
  whenEnds: String,//Date.now()+duration on start quiz
  isBegan: Boolean,
  isEnded: Boolean,
  results: [{
    login: String,
    sumscore: Number,
    tasks: [{
      score: Number,
      tries: Number,
      attempts: [{
        date: String,
        score: String
      }]
    }]
  }],
  attempts: [{//do not add attempts to user.attempts but add here
    login: String,
    date: String,
    TaskID: String,
    score: Number,
    programText: String,
    language: String,
    result: [String]
  }]

}, { collection: config.mongodbConfigs.CollectionNames.quizes });

// Create model from schema
module.exports = Quiz = mongoose.model('Quiz', QuizSchema);

