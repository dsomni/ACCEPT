const mongoose = require('mongoose')
const config = require('../configs');

const TaskSchema = new mongoose.Schema({
    identificator: String,
    grade: Number,//
    title: String,
    statement: String,
    examples: Array,
    tests: Array,
    topic: String,//
    hint: Object,//
    author: String//

}, { collection: config.mongodbConfigs.CollectionNames.tasks });

// Create model from schema
module.exports = Task = mongoose.model('Task', TaskSchema);

