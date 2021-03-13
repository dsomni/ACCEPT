const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString,{
    useNewUrlParser: true,
    useUnifiedTopology: true
})

var UserSchema = new mongoose.Schema({
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
var User = mongoose.model('User', UserSchema);

async function go() {
    let users = await User.find({}).exec();
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        let verdicts = user.verdicts;
        console.log(user.verdicts)
        for (let j = 0; j < verdicts.length; j++){
           verdicts[j].taskID = '0_' + verdicts[j].taskID;
        }
       user.verdicts = verdicts;
        users[i].markModified('verdicts');
        await user.save();
        console.log(user.verdicts)
    }
}
go();

setTimeout(()=>{
    process.exit()
},10000)