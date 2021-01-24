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

async function run(){

    //-----------------------------------------------------------------
    // Repair Hints
    let tasks = await Task.find({}).exec()
    for(let i=0;i<tasks.length;i++){
        let task = tasks[i];
        if(!task.hint){

            task.hint = {
                text: '',
                attemptsForHint: 0,
                doesExist: false
            };
            await task.save()
        }
    }
}

run()

setTimeout(()=>{
    process.exit()
},10000)