const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString;
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
};

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});



var deletedTask = process.argv[3];
var TourId = process.argv[2];

var TournamentSchema = new mongoose.Schema({
    identificator: Number,
    title : String,
    description: String,
    tasks: [{
        identificator: Number,
        title: String,
        author: String,
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

}, { collection: config.mongodbConfigs.CollectionNames.tournaments});

// Create model from schema
var Tournament = mongoose.model('Tournament', TournamentSchema);

let tournament = await Tournament.find({ identificator: TourId });

tournament.tasks.pop(deletedTask);

for (let i = 0; i < tournament.tasks.length; i++){
    if (tournament.tasks[i] > deletedTask) tournament.tasks[i].identificator -= 1;
};