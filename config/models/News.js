const mongoose = require('mongoose')
const config = require('../configs');

const NewsSchema = new mongoose.Schema({
    identificator: Number,
    title: String,
    textOnMain: String,
    text: String,
    reference: String,
    date: String,
    image: String,
    author: String

}, { collection: config.mongodbConfigs.CollectionNames.news });

// Create model from schema
module.exports = News = mongoose.model('News', NewsSchema);

