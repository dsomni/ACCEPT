const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString
if(config.mongodbConfigs.User.Username!="" && config.mongodbConfigs.User.Password!=""){
    connectionString = "mongodb://"+config.mongodbConfigs.User.Username+":"+config.mongodbConfigs.User.Password+"@"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}else{
    connectionString = "mongodb://"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}

mongoose.connect(connectionString,{
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const User = require('../../config/models/User');

var deletedTournament = process.argv[2]

async function run(){
    let users = await User.find({}).exec();
    for(let i = 0; i<users.length; i++){
        let user = users[i];
        user.attempts = user.attempts.filter(item => item.taskID.split("_")[0]!=deletedTournament);
        user.verdicts = user.verdicts.filter(item => item.taskID.split("_")[0]!=deletedTournament);
        user.markModified('attempts');
        user.markModified('verdicts');
        user.save()
    }
}
run()

setTimeout(() => {
    process.exit()
}, 10000)