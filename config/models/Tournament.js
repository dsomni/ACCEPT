const mongoose = require('mongoose')
const config = require('../configs');

const TournamentSchema = new mongoose.Schema({
    identificator: Number,
    title: String,
    description: String,
    tasks: [{
        identificator: String,
        author: String,
        title: String,
        statement: String,
        examples: Array,
        tests: Array,
    }],
    author: String,
    participants: Array,
    whenStarts: String,
    whenEnds: String,
    isBegan: Boolean,
    isEnded: Boolean

}, { collection: config.mongodbConfigs.CollectionNames.tournaments });

// Create model from schema
module.exports = Tournament = mongoose.model('Tournament', TournamentSchema);

