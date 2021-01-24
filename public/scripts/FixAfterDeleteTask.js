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


var LessonSchema = new mongoose.Schema({
    identificator: Number,
    grade: Number,
    title : String,
    description: String,
    tasks: Array,
    author: String

}, {collection: config.mongodbConfigs.CollectionNames.lessons});

var UserSchema = new mongoose.Schema({
    login: { 
        type: String, 
        unique: true,
        index: true
    },
    password: String,
    name : String,

    grade: Number,
    gradeLetter: String,
    group: String,
    attempts: Array,
    verdicts: Array,

    isTeacher: Boolean
}, {collection: config.mongodbConfigs.CollectionNames.users});

// Create model from schema
var Lesson = mongoose.model('Lesson', LessonSchema );

// Create model from schema
var Task = mongoose.model('Task', TaskSchema );

// Create model from schema
var User = mongoose.model('User', UserSchema );

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
    let toDelete = []
    for(let i=0; i<lessons.length;i++){
        lesson = lessons[i]
        deleted = lesson.tasks.findIndex(Element => Element == deletedTask)
        if(deleted != -1){
            lesson.tasks.splice(deleted, 1)
        }
        if( lesson.tasks.length==0){
            toDelete.push(lesson.identificator)
        }
        for(let j = 0; j<lesson.tasks.length; j++){
            if(lesson.tasks[j]>deletedTask){
                lesson.tasks[j]-=1
            }
        }
        await lesson.save()
    }
    for(let i=0; i<toDelete.length;i++){
        await Lesson.deleteOne({identificator: toDelete[i]})
    }

    let users = await User.find({}).exec()
    for(let i=0;i<users.length;i++){
        user = users[i];

        attempts = user.attempts;
        deleted = attempts.findIndex(Element => Element.taskID == deletedTask)
        while(deleted!=-1){
            attempts.splice(deleted, 1);
            deleted = attempts.findIndex(Element => Element.taskID == deletedTask)
        }
        for(let j = 0; j<attempts.length; j++){
            if(attempts[j].taskID>deletedTask){
                attempts[j].taskID-=1;
            }
        }
        user.attempts = attempts;

        verdicts = user.verdicts;
        deleted = verdicts.findIndex(Element => Element.taskID == deletedTask)
        while(deleted!=-1){
            verdicts.splice(deleted, 1);
            deleted = verdicts.findIndex(Element => Element.taskID == deletedTask)
        }
        for(let j = 0; j<verdicts.length; j++){
            if(verdicts[j].taskID>deletedTask){
                verdicts[j].taskID-=1;
            }
        }
        user.verdicts = verdicts;

        await user.save()
    }
}
run()

setTimeout(()=>{
    process.exit()
},15000)