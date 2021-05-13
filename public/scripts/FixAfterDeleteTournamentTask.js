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

const Tournament = require('../../config/models/Tournament');
const User = require('../../config/models/User');

var deletedTask = process.argv[3];
var TourId = process.argv[2];
async function run() {
    let tournament = await Tournament.findOne({ identificator: TourId });

    let deleted = tournament.tasks.findIndex(Element => Element.taskID == deletedTask)
    tournament.tasks.splice(deleted, 1);
    for (let i = 0; i < tournament.tasks.length; i++) {
        if (tournament.tasks[i].identificator.split('_')[1] > deletedTask.split('_')[1])
            tournament.tasks[i].identificator = TourId + '_' + (parseInt(tournament.tasks[i].identificator.split('_')[1]) - 1);
    };

    tournament.markModified('tasks');
    await tournament.save();

    let users = await User.find({}).exec()
    for (let i = 0; i < users.length; i++) {
        user = users[i];

        attempts = user.attempts;
        deleted = attempts.findIndex(Element => Element.taskID == deletedTask)
        while (deleted != -1) {
            attempts.splice(deleted, 1);
            deleted = attempts.findIndex(Element => Element.taskID == deletedTask)
        }
        for (let j = 0; j < attempts.length; j++) {
            if (attempts[j].taskID.split('_')[1] > deletedTask.split('_')[1]) {
                attempts[j].taskID = attempts[j].taskID.split('_')[0] + '_' + (parseInt(attempts[j].taskID.split('_')[1]) - 1);
            }
        }
        user.attempts = attempts;

        verdicts = user.verdicts;
        deleted = verdicts.findIndex(Element => Element.taskID == deletedTask)
        while (deleted != -1) {
            verdicts.splice(deleted, 1);
            deleted = verdicts.findIndex(Element => Element.taskID == deletedTask)
        }
        for (let j = 0; j < verdicts.length; j++) {
            if (verdicts[j].taskID.split('_')[1] > deletedTask.split('_')[1]) {
                verdicts[j].taskID = verdicts[j].taskID.split('_')[0] + '_' + (parseInt(verdicts[j].taskID.split('_')[1]) - 1);;
            }
        }
        user.verdicts = verdicts;

        await user.save()
    }
}

run()

setTimeout(() => {
    process.exit()
}, 10000)