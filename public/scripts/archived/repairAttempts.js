const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const User = require('../../config/models/User');

async function go()  {
    let users = await User.find({}).exec();
    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        let attempts = user.attempts;
        for (let j = 0; j < attempts.length; j++){
            if (!attempts[j].taskID.includes('_'))
                attempts[j].taskID = '0_' + attempts[j].taskID;
        }
        user.attempts = attempts;
        users[i].markModified('attempts');
        await  user.save( );
    }
}
go();

setTimeout(()=>{
    process.exit()
},10000)