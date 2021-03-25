const mongoose = require('mongoose')
const config = require('../configs');

const TournamentSchema = new mongoose.Schema({
    identificator: Number,
    title: String,
    description: String,
    messages: [String],
    tasks: [{
        identificator: String,
        author: String,
        title: String,
        statement: String,
        examples: Array,
        tests: Array,
    }],
    author: String,
    whenStarts: String,
    whenEnds: String,
    isBegan: Boolean,
    isEnded: Boolean,
    results: [{
        login: String,
        sumscore: Number,
        sumtime: Number,//sum from start
        tasks: [{
            score: Number,
            dtime: Number,//from start
            tries: Number
        }]
    }]

}, { collection: config.mongodbConfigs.CollectionNames.tournaments });

// Create model from schema
module.exports = Tournament = mongoose.model('Tournament', TournamentSchema);

