const mongoose = require('mongoose')
const config = require('../configs');

const LessonSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title: String,
    description: String,
    tasks: Array,
    author: String

}, { collection: config.mongodbConfigs.CollectionNames.lessons });


// Create model from schema
module.exports = Lesson = mongoose.model('Lesson', LessonSchema);

