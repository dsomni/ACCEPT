const mongoose = require('mongoose')
const config = require('../configs');

const TournamentSchema = new mongoose.Schema({
    identificator: Number,
    title: String,
    description: String,
    messages: [String],
    mods: [String],
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
    whenStarts: String,
    whenEnds: String,
    isBegan: Boolean,
    isEnded: Boolean,
    allowRegAfterStart: Boolean,
    allOrNothing: Boolean,
    results: [{
        login: String,
        sumscore: Number,
        sumtime: Number,//sum from start
        tasks: [{
            score: Number,
            dtime: Number,//from start
            tries: Number
        }]
    }],
    frozeAfter: String,
    isFrozen: Boolean,
    frozenResults: [{
        login: String,
        sumscore: Number,
        sumtime: Number,//sum from start
        tasks: [{
            score: Number,
            dtime: Number,//from start
            tries: Number
        }]
    }],
    attempts: [{
        login: String,
        AttemptDate: String,
        TaskID: String,
        score: Number
    }]

}, { collection: config.mongodbConfigs.CollectionNames.tournaments });

// Create model from schema
module.exports = Tournament = mongoose.model('Tournament', TournamentSchema);

