const fs = require('fs');
const childProcess = require("child_process");

const mongoose = require('mongoose');
const config = require('../../config/db');


async function go(){

    mongoose.connect(config.db,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    var TaskSchema = new mongoose.Schema({
        identificator: Number,
        title : String,
        statement: String,
        examples: Array,
        tests: Array,
        topic: String,
        author: String

    }, {collection: 'tasks'});

    // Create model from schema
    var Task = mongoose.model('Task', TaskSchema );

    var task;



    var path = process.argv[2];
    var fileName = process.argv[3];
    var taskid = process.argv[4];
    var result = "";

    var tltext = 'del ' + path + '\\TLlog.txt\n' + 
    'del ' + path + '\\output.txt\n' +
    'start ' + path + '\\' + fileName + '.exe\n' +
    'timeout /t 1\n'+
    'taskkill /im ' + fileName + '.exe >> '+ path + '\\TLlog.txt\n' +
    'exit';


    var assignText='\nassign (input,\''+ path +'\\input.txt\'); reset(input);' +
    '\nassign (output,\''+ path + '\\output.txt\'); rewrite(output);'

    var programText = fs.readFileSync(path+"\\programText.txt", "utf-8");
    let idx = programText.toUpperCase().indexOf('BEGIN')

    programText = programText.slice(0, idx+5) + assignText + programText.slice(idx+5)

    fs.writeFileSync(path + '\\'+fileName +'.pas', programText, "utf8");

    try{
        childProcess.execSync(__dirname + '\\pascalCompiler\\pabcnetcclear.exe '+ path + '\\'+fileName +'.pas');
    }catch{
        // Compilation Error
        
        result += "Test # 1" + "*" + "Compilation Error" + "*" + "er" 
        fs.writeFileSync(path + '\\result.txt', result, "utf8");

        process.exit();
    }

    task =  await Task.findOne({identificator: taskid}).exec()

    var tests = task.tests

    for(var i = 0; i<tests.length; i++){
        fs.writeFileSync(path + '\\input'+i+".txt", tests[i][0], "utf8");
        fs.writeFileSync(path + '\\output'+i+".txt", tests[i][1], "utf8");
    }


    for(var i = 0; i < tests.length; i++){

        fs.writeFileSync(path + '\\input.txt', fs.readFileSync(path+'\\input' + i + '.txt', "utf8").trim(), "utf8");



        fs.writeFileSync(path + '\\tlchecker.bat', tltext, "utf8");


        childProcess.execSync('start ' + path + '\\tlchecker.bat');
        if (fs.readFileSync(path +"\\TLlog.txt").length != 0){
            // Time Limit
            result += "Test #" + (i+1).toString() + "*" + "Time Limit exceeded" + "*" + "er" +"\n" 
            break;
        }


        let fileContent = fs.readFileSync(path +"\\output.txt", "utf8").trim();
        let correctOutput = fs.readFileSync(path +"\\output" + i + '.txt', "utf8").trim();

        if (fileContent.length == 0){
            // Something goes wrong during execution
            result += "Test #" + (i+1).toString() + "*" + "Runtime Error" + "*" + "er" +"\n" 
            break
        }else if(fileContent != correctOutput){
            // Wrong answer
            result += "Test #" + (i+1).toString() + "*" + "Wrong Answer" + "*" + "er" +"\n" 
            break
        }
        result += "Test #" + (i+1).toString() + "*" + "OK" + "*" + "ok" +"\n" 
    }
    fs.writeFileSync(path + '\\result.txt', result, "utf8");

}
go();