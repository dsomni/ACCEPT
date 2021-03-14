const mongoose = require('mongoose')
const config = require('../configs');

const UserSchema = new mongoose.Schema({
    login: {
        type: String,
        unique: true,
        index: true
    },
    password: String,
    name: String,

    grade: Number,
    gradeLetter: String,
    group: String,
    attempts: Array,
    verdicts: Array,

    isTeacher: Boolean
}, { collection: config.mongodbConfigs.CollectionNames.users });

// Create model from schema
module.exports = User = mongoose.model('User', UserSchema);

