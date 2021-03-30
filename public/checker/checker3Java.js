const fs = require('fs');
const childProcess = require("child_process");

const mongoose = require('mongoose');
const config = require('../../config/configs');

childProcess.exec('chcp 65001 | dir');

let connectionString
if(config.mongodbConfigs.User.Username!="" && config.mongodbConfigs.User.Password!=""){
    connectionString = "mongodb://"+config.mongodbConfigs.User.Username+":"+config.mongodbConfigs.User.Password+"@"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}else{
    connectionString = "mongodb://"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}
mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
const Task = require('../../config/models/Task');
const Tournament = require('../../config/models/Tournament');

async function go(){

    let path = process.argv[2];
    let fileName = process.argv[3];
    let taskid = process.argv[4];
    let tour_id = process.argv[4].split('_')[0];


    let programText = fs.readFileSync(path+"\\programText.txt", "utf8");

    fs.writeFileSync(path + '\\'+fileName +'.java', programText, "utf8");
    /*try{
        let err = childProcess.execSync('javac '+ path + '\\'+fileName +'.java');
    }catch{
        // Compilation Error

        fs.writeFileSync(path + '\\result.txt', "Test # 1" + "*" + "Compilation Error" + "*" + "er" , "utf8");

        process.exit();
    }*/

    let task;

    if (tour_id == '0') {
        task = await Task.findOne({ identificator: taskid }).exec();
    } else {
        let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
        task = tournament.tasks.find(item => item.identificator == taskid);
    }

    let tests = task.tests

    for(let i = 0; i<tests.length; i++){
        fs.writeFileSync(path + '\\input'+i+".txt", tests[i][0], "utf8");
        fs.writeFileSync(path + '\\output'+i+".txt", tests[i][1], "utf8");
    }

    fs.writeFileSync(path + '\\result.txt', "");

    for(let i = 0; i < tests.length; i++){

        childProcess.exec('node' + ' ' +
        __dirname + '\\checker3JavaHelper.js' + ' ' +
        path + ' ' +
        fileName + ' ' +
        i);

    }
    setTimeout(()=>{
        process.exit()
    },1000)

}
go();