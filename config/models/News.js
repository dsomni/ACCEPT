const mongoose = require('mongoose')
const config = require('../configs');

const NewsSchema = new mongoose.Schema({
    identificator: Number,
    title: String,
    description: String,
    text: String,
    date: String,
    imageName: String,
    author: String

}, { collection: config.mongodbConfigs.CollectionNames.news });

// Create model from schema
module.exports = News = mongoose.model('News', NewsSchema);

