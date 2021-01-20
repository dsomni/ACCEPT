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

var deletedLesson = process.argv[2]

async function run(){
    await Lesson.deleteOne({identificator: deletedLesson})
    let lesson;
    let lessons = await Task.find({}).exec()
    for(let i = 0; i<lessons.length; i++){
        lesson = lessons[i]
        if(lesson.identificator>deletedLesson){
            lesson.identificator = lesson.identificator-1
            lesson.save()
        }
    }
}
run()