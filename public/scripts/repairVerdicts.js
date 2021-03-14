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

async function run(){

    //-----------------------------------------------------------------
    // Repair Verdicts
    let users = await User.find({}).exec()
    for(let i=0;i<users.length;i++){
        user = users[i];
        let attempts = user.attempts
        verdicts = []
        for(var j = attempts.length-1; j >= 0; j--){
            let verdict = verdicts.find(item => item.taskID == attempts[j].taskID)
            if(!verdict){
                verdicts.push({
                    taskID: attempts[j].taskID,
                    result: getVerdict(attempts[j].result)
                })
            } else if(verdict.result!="OK"){
                let idx = verdicts.findIndex(item => item.taskID == attempts[j].taskID)
                verdicts.splice(idx,1);
                verdicts.push({
                    taskID: attempts[j].taskID,
                    result: getVerdict(attempts[j].result)
                })
            }
        }
        user.verdicts = verdicts;
        await user.save()
    }
}

function getVerdict(results){
    for(let i=0;i<results.length;i++){
        if(results[i][1]!="OK"){
            return results[i][1];
        }
    }
    return "OK";
}

run()

setTimeout(()=>{
    process.exit()
},10000)