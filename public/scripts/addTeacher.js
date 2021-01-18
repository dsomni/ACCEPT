const mongoose = require('mongoose');
const config = require('../../config/configs');
const xlsx = require('node-xlsx').default;

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
    attempts: Array,
    verdicts: Array,

    isTeacher: Boolean
}, {collection: 'users'});

// Create model from schema
var User = mongoose.model('User', UserSchema );

async function addTeacher (login, password, name){
    await User.insertMany([{
        login: login,
        password: password,
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
        check = await User.findOne({login:teacher[0]})
        if(check){
            check.password = teacher[2]
            check.name = teacher[1]

            if(check.verdicts.length==0){
                let attempts = check.attempts
                verdicts = []
                for(var j = attempts.length-1; j >= 0; j--){
                    let verdict = verdicts.find(item => item.taskID == attempts[j].taskID)
                    if(!verdict){
                        verdicts.push({
                            taskID: attempts[j].taskID,
                            result: attempts[j].result[attempts[j].result.length - 1][1]
                        })
                    } else if(verdict.result!="OK"){
                        let idx = verdicts.findIndex(item => item.taskID == attempts[j].taskID)
                        verdicts[idx] = {
                            taskID: attempts[j].taskID,
                            result: attempts[j].result[attempts[j].result.length - 1][1]
                        }
                    }
                }
                check.verdicts = verdicts;
            }

            await check.save()
        }else{
            await addTeacher(teacher[0], teacher[2], teacher[1])
        }
    }
}

toDo()

