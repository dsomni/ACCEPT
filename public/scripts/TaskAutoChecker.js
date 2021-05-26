const mongoose = require('mongoose');
const config = require('../../config/configs');
const childProcess = require("child_process");
const path = require('path')
const fs = require('fs')

let connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const Task = require('../../config/models/Task');
const User = require('../../config/models/User');
const Tournament = require('../../config/models/Tournament');

var isBusy = false;

async function check(){
    if(!isBusy){
        isBusy = true;

        let processesPath = path.normalize(__dirname + "\\..\\processes");

        let files = await fs.readdirSync(processesPath);
        for(let i=0; i<files.length;i++){
            let filename = files[i];
            let folderPath = path.normalize(processesPath + '\\'+filename);
            let info = filename.split('_')
            if(info.length!=3){
                try{
                    fs.rmdirSync(folderPath,{recursive: true});
                }
                catch(err){
                    try{
                        fs.unlinkSync(path);
                    }
                    catch(err2){
                        console.log(err2)
                    }
                }
                break;
            }
            let user_login = info[0];
            let tournament_id = info[1];
            let task_id = info[2];
            let full_id = tournament_id+"_"+task_id;

            let user = await User.findOne({ login: user_login }).exec();

            if(tournament_id == "0"){
                let problem = await Task.findOne({ identificator: full_id }).exec();
                fs.stat(folderPath, function(err,stats) {
                    if(!err && Date.now()){
                        fs.stat(path.join(folderPath + "\\result.txt"), async function(err,stats2) {
                            if (!err) {
                                let resultStrings = fs.readFileSync(path.normalize(folderPath + "\\result.txt"),"utf-8").trim().split("\n");
                                if(resultStrings[0].length >0 && (resultStrings[0] == 'Test #1*Compilation Error*er' || resultStrings.length == problem.tests.length)){

                                    let result = [];
                                    for(let i = 0; i < resultStrings.length; i++){
                                        result.push(resultStrings[i].split('*'));
                                    }
                                    result.sort((a,b)=>{
                                        return Number(a[0].split('#')[1]) -  Number(b[0].split('#')[1])
                                    })

                                    let idx = user.verdicts.findIndex(item => item.taskID == full_id)
                                    if(idx==-1){
                                        user.verdicts.push({
                                            taskID: full_id,
                                            result: getVerdict(result)
                                        })
                                    } else if(user.verdicts[idx].result!="OK"){
                                        user.verdicts.splice(idx,1);
                                        user.verdicts.push({
                                            taskID: full_id,
                                            result: getVerdict(result)
                                        })
                                    }

                                    let attempts = user.attempts;
                                    let idxx = 0;
                                    let obj = {};
                                    for(let k = 0; k < attempts.length; k++){
                                        if( attempts[k].taskID == full_id){
                                            obj = user.attempts[k];
                                            idxx = k;
                                            break;
                                        }
                                    }
                                    user.attempts.splice(idxx,1,{taskID: obj.taskID, date: obj.date,
                                        programText: obj.programText, result: result, language: obj.language})
                                    await user.save();

                                    fs.rmdirSync(folderPath,{recursive: true});
                                }
                            }else if(Date.now() - stats.birthtimeMs >= config.FolderLifeTime){
                                    fs.rmdirSync(folderPath,{recursive: true});
                            }
                        });
                    }
                });
            }else{
                let tournament = await Tournament.findOne({ identificator: tournament_id }).exec();
                let whenEnds = tournament.whenEnds;
                let isBegan = tournament.isBegan;

                let problem = tournament.tasks.find(item => item.identificator == full_id);

                fs.stat(folderPath, function (err, stats) {
                    if (!err && Date.now()) {
                        fs.stat(path.normalize(folderPath + "\\result.txt"), async function (err, stats2) {
                            if (!err) {
                                let resultStrings = fs.readFileSync(path.normalize(folderPath + "\\result.txt"), "utf-8").trim().split("\n");
                                if (resultStrings[0].length >0 && (resultStrings[0] == 'Test #1*Compilation Error*er' || resultStrings.length == problem.tests.length)) {

                                    let result = [];
                                    for (let i = 0; i < resultStrings.length; i++) {
                                        result.push(resultStrings[i].split('*'));
                                    }
                                    result.sort((a, b) => {
                                        return Number(a[0].split('#')[1]) - Number(b[0].split('#')[1])
                                    })

                                    let idx = user.verdicts.findIndex(item => item.taskID == full_id)
                                    if (idx == -1) {
                                        user.verdicts.push({
                                            taskID: full_id,
                                            result: getVerdict(result)
                                        })
                                    } else if (user.verdicts[idx].result != "OK") {
                                        user.verdicts.splice(idx, 1);
                                        user.verdicts.push({
                                            taskID: full_id,
                                            result: getVerdict(result)
                                        })
                                    }

                                    let attempts = user.attempts;
                                    let idxx = 0;
                                    let obj = {};
                                    for (let k = 0; k < attempts.length; k++) {
                                        if (attempts[k].taskID == full_id) {
                                            obj = user.attempts[k];
                                            idxx = k;
                                            break;
                                        }
                                    }
                                    user.attempts.splice(idxx, 1, {
                                        taskID: obj.taskID,
                                        date: obj.date,
                                        programText: obj.programText,
                                        result: result,
                                        language: obj.language
                                    })
                                    await user.save()

                                    let score =  getScore(result);
                                    if(score!=100 && tournament.allOrNothing){
                                        score = 0;
                                    }
                                    tournament.attempts.push({
                                        login: user.login,
                                        AttemptDate: user.attempts[0].date,
                                        TaskID: full_id,
                                        score
                                    });

                                    // tournament results update
                                    let user_result_idx = tournament.results.findIndex(item => item.login == user.login.toString());
                                    if(!tournament.isEnded && user_result_idx!=-1 && task_id>=tournament.results[user_result_idx].tasks.length){
                                        while(tournament.results[user_result_idx].tasks.length<=task_id){
                                            tournament.results[user_result_idx].tasks.push({
                                                score: 0,
                                                dtime:0,
                                                tries:0
                                            })
                                        }
                                    }
                                    if (!tournament.isEnded && user_result_idx!=-1 && tournament.results[user_result_idx].tasks[task_id].score!=100){
                                        tournament.results[user_result_idx].tasks[task_id].tries += 1;
                                        if (score != 100)
                                            tournament.results[user_result_idx].sumtime += tournament.penalty;
                                        if( tournament.results[user_result_idx].tasks[task_id].score < score){
                                            tournament.results[user_result_idx].sumscore -= tournament.results[user_result_idx].tasks[task_id].score;
                                            tournament.results[user_result_idx].sumscore += score;
                                            tournament.results[user_result_idx].tasks[task_id].score = score;

                                            let now = new Date();
                                            tournament.results[user_result_idx].sumtime -= tournament.results[user_result_idx].tasks[task_id].dtime;
                                            tournament.results[user_result_idx].sumtime += now-Date.parse(tournament.whenStarts);
                                            tournament.results[user_result_idx].tasks[task_id].dtime = now-Date.parse(tournament.whenStarts);

                                        }
                                    }
                                    tournament.markModified("results");
                                    await tournament.save()

                                    fs.rmdirSync(folderPath, { recursive: true });
                                }
                            } else if (Date.now() - stats.birthtimeMs >= config.FolderLifeTime) {
                                    fs.rmdirSync(path.normalize(folderPath), { recursive: true });
                            }
                        });
                    }
                });
            }
        }
        isBusy = false;
    }

}

let max = (a, b)=>{if(a>b)return a;return b};

function getVerdict(results){
    for(let i=0;i<results.length;i++){
        if(results[i][1]!="OK"){
            return results[i][1];
        }
    }
    if(results.length>0)
        return "OK";
    return 'err';
}

function getScore(results){
    return Math.ceil(results.filter(item => item[2]=="ok").length/results.length*100)
}

check();

setInterval(()=>{
    check();
},2000)

setTimeout(()=>{
    process.exit();
},1000*60*10)