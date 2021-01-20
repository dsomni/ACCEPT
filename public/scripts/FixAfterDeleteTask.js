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
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.tasks});


var LessonSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    description: String,
    tasks: Array,
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.lessons});

// Create model from schema
var Lesson = mongoose.model('Lesson', LessonSchema );

// Create model from schema
var Task = mongoose.model('Task', TaskSchema );

var deletedTask = process.argv[2]



async function run(){
    await Task.deleteOne({identificator: deletedTask})
    let task;
    let tasks = await Task.find({}).exec()
    for(let i = 0; i<tasks.length; i++){
        task = tasks[i]
        if(task.identificator>deletedTask){
            task.identificator = task.identificator-1
            task.save()
        }
    }
    let lesson;
    let deleted;
    let lessons = await Lesson.find({}).exec()
    for(let i=0; i<lessons.length;i++){
        lesson = lessons[i]
        deleted = lesson.tasks.findIndex(Element => Element == deletedTask)
        if(deleted != -1){
            lesson.tasks.splice(deleted, 1)
        }
        for(let j = 0; j<lesson.tasks.length; j++){
            if(lesson.tasks[j]>deletedTask){
                lesson.tasks[j]-=1
            }
        }
        lesson.save()
    }
}
run()