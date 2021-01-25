  
const fs = require('fs');
const childProcess = require("child_process");

const mongoose = require('mongoose');
const config = require('../../config/configs');

var connectionString
if(config.mongodbConfigs.User.Username!="" && config.mongodbConfigs.User.Password!=""){
    connectionString = "mongodb://"+config.mongodbConfigs.User.Username+":"+config.mongodbConfigs.User.Password+"@"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}else{
    connectionString = "mongodb://"+config.mongodbConfigs.Host+"/"+config.mongodbConfigs.dbName
}

async function go(){

    mongoose.connect(connectionString,{
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    var TaskSchema = new mongoose.Schema({
        identificator: Number,
        grade: Number,
        title : String,
        statement: String,
        examples: Array,
        tests: Array,
        topic: String,
        hint: Object,
        author: String
    
    }, {collection: config.mongodbConfigs.CollectionNames.tasks});

    // Create model from schema
    var Task = mongoose.model('Task', TaskSchema );

    var task;


    var path = process.argv[2];
    var fileName = process.argv[3];
    var taskid = process.argv[4];


    var programText = fs.readFileSync(path+"\\programText.txt", "utf-8");

    fs.writeFileSync(path + '\\'+fileName +'.pas', programText, "utf8");

    
    try{
        childProcess.execSync(__dirname + '\\pascalCompiler\\pabcnetcclear.exe '+ path + '\\'+fileName +'.pas');
    }catch{
        // Compilation Error
        
        fs.writeFileSync(path + '\\result.txt', "Test # 1" + "*" + "Compilation Error" + "*" + "er" , "utf8");

        process.exit();
    }

    task =  await Task.findOne({identificator: taskid}).exec()

    var tests = task.tests

    for(var i = 0; i<tests.length; i++){
        fs.writeFileSync(path + '\\input'+i+".txt", tests[i][0], "utf8");
        fs.writeFileSync(path + '\\output'+i+".txt", tests[i][1], "utf8");
    }

    fs.writeFileSync(path + '\\result.txt', "");

    for(var i = 0; i < tests.length; i++){

        childProcess.exec('node' + ' ' +
        __dirname + '\\checker3PascalHelper.js' + ' ' + 
        path + ' ' +
        fileName + ' ' +
        i);
    
    }
    setTimeout(()=>{
        process.exit()
    },1000)

}
go();