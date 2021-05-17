const mongoose = require('mongoose');
const config = require('../../config/configs');
const xlsx = require('node-xlsx').default;
const bcrypt = require('bcryptjs');

//MongoDB connecting
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
mongoose.connection.on('connected', () => {
    console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
    console.log("Error while connecting to DB: "+ err);
});

mongoose.set('useCreateIndex', true);

const User = require('../../config/models/User');

async function addTeacher (login, password, name){
    await User.insertMany([{
        login: login,
        password: bcrypt.hashSync(password.toString(), 10).toString(),
        name: name,

        attempts: [],
        verdicts: [],
        isTeacher: true
    }]);
}

async function toDo(){

    const workSheetsFromFile = await xlsx.parse(config.PathToTeachersList);

    var data = workSheetsFromFile[0].data
    var teacher, check;
    for(var i = 1; i < data.length; i++){
        teacher = data[i];
        if(teacher.length==0)
            break;
        check = await User.findOne({login:teacher[0]})
        if(check){
            check.password = bcrypt.hashSync(teacher[2].toString(), 10).toString()
            check.name = teacher[1]

            await check.save()
        }else{
            await addTeacher(teacher[0], teacher[2], teacher[1])
        }
    }
}

toDo().then(() => { console.log("Done"); process.exit() });