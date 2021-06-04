const mongoose = require('mongoose');
const config = require('../../../config/configs');

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

const Lesson = require('../../../config/models/Lesson');

var deletedLesson = process.argv[2]

async function run(){
    await Lesson.deleteOne({identificator: deletedLesson})
    let lesson;
    let lessons = await Lesson.find({}).exec()
    for(let i = 0; i<lessons.length; i++){
        lesson = lessons[i]
        if(lesson.identificator>deletedLesson){
            lesson.identificator = lesson.identificator-1
            lesson.save()
        }
    }
}
run()

setTimeout(() => {
    process.exit()
}, 10000)