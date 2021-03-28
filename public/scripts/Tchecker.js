const mongoose = require('mongoose');
const config = require('../../config/configs');
const childProcess = require("child_process");
const path = require('path')

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

const Tournament = require('../../config/models/Tournament');

var to_check_end=[];
var to_check_begin=[];
var now;

async function checkEnd(){
    now = new Date();
    now = new Date(now);
    let b = false;
    for(let i=0;i<to_check_end.length;i++){
        tournament = to_check_end[i];
        if (now - Date.parse(tournament.whenEnds)>=0){
            b = true;
            tournament.isEnded = true;
            tournament.markModified('isEnded');
            await tournament.save();
            childProcess.exec('node ' + path.join(__dirname, '/generateExcelT.js') + ' ' + tournament.identificator);
        }
    }
    if(b){
        fillTo_check_begin();
        fillTo_check_end();
    }
}

async function checkBegin(){
    now = new Date();
    now = new Date(now);
    let b = false;
    //console.log(to_check_begin)
    //console.log(now)
    for(let i=0;i<to_check_begin.length;i++){
        tournament = to_check_begin[i];
        if (now - Date.parse(tournament.whenStarts) >= 0 && !tournament.isBegan){
            b = true;
            tournament.isBegan = true;
            tournament.results.forEach(item => {
                for (let i = 0; i < tournament.tasks.length; i++) {
                    item.tasks.push({
                        score: 0,
                        dtime: 0,//from start
                        tries: 0
                    })
                }
            });
            tournament.markModified('results');
            tournament.markModified('isBegan');
            await tournament.save();
        }
    }
    if(b){
        fillTo_check_begin();
        fillTo_check_end();
    }
}

async function fillTo_check_end(){
    to_check_end = await Tournament.find({isBegan:true,isEnded:false}).exec();
}

async function fillTo_check_begin(){
    to_check_begin = await Tournament.find({isBegan:false}).exec();
}

fillTo_check_begin();
fillTo_check_end();
checkBegin();
checkEnd();

setInterval(()=>{
    checkBegin();
    checkEnd();
},1000)

setInterval(()=>{
    fillTo_check_begin();
    fillTo_check_end();
},5*1000)

setTimeout(()=>{
    process.exit();
},1000*60*10)
