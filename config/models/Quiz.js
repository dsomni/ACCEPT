const mongoose = require('mongoose')
const config = require('../configs');

const QuizSchema = new mongoose.Schema({
  identificator: Number,
  title: String,
  description: String,
  author: String,
  duration: Number,
  hasActiveLesson: Boolean,
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
  lessons: [{
    grade: String,
    whenEnds: String,
    isEnded: Boolean,
    teacher: String,
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
    attempts: [{
      login: String,
      date: String,
      TaskID: String,
      score: Number,
      programText: String,
      language: String,
      result: [Array]
    }],
  }]
}, { collection: config.mongodbConfigs.CollectionNames.quizes });

// Create model from schema
module.exports = Quiz = mongoose.model('Quiz', QuizSchema);