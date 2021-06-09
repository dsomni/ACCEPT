const fs = require('fs');
const childProcess = require("child_process");
const pathConst = require("path");
const mongoose = require('mongoose');
const config = require('../../config/configs');
const checkProcess = require("is-running")

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
});

function max(a, b) {
    if (a > b) return a
    return b
}

function countProcesses() {
    return fs.readdirSync(pathConst.join(__dirname + '/../processes')).length;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const Task = require('../../config/models/Task');
const Tournament = require('../../config/models/Tournament');
const Quiz = require('../../config/models/Quiz');

async function go(){
    let path = process.argv[2];
    let fileName = process.argv[3];
    let taskid = process.argv[4];
    let tour_id = process.argv[4].split('_')[0];

    let programText = fs.readFileSync(path+"/programText.txt", "utf8");
    programText = '# -*- coding: cp1251 -*-' + '\n' + programText

    fs.writeFileSync(path + '/'+fileName +'.py', programText, "utf8");

    let task;

    if (tour_id[0] == "Q") {
        let quiz = await Quiz.findOne({ identificator: tour_id.slice(1) });
        task = quiz.tasks.find(item => item.identificator == taskid);
    } else if (tour_id == '0') {
        task = await Task.findOne({ identificator: taskid }).exec();
    } else {
        let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
        task = tournament.tasks.find(item => item.identificator == taskid);
    }

    let tests = task.tests

    for(let i = 0; i<tests.length; i++){
        fs.writeFileSync(path + '/input'+i+".txt", tests[i][0], "utf8");
        fs.writeFileSync(path + '/output'+i+".txt", tests[i][1], "utf8");
    }

    fs.writeFileSync(path + '/result.txt', "");

    let pids = [];
    for(let i = 0; i < tests.length; i++){
        if (i % max(1, Math.trunc(config.maxThreadsTests - 0.7 * countProcesses())) == 0) {
            await sleep(1000);
        }
        pids.push(childProcess.exec('node' + ' ' +
        __dirname + '/checker3PythonHelper.js' + ' ' +
        path + ' ' +
        fileName + ' ' +
        i).pid);

    }
    setInterval(() => {
        let i = 0;
        while (i < pids.length) {
            if (!checkProcess(pids[i])) {
                pids.splice(i, 1);
            } else {
                i++;
            }
        }
        if (pids.length == 0) {
            process.exit()
        }
    }, 500);

}
go();