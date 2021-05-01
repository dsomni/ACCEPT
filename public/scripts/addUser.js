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

async function addStudent (login, password, name, grade, gradeLetter, group){
    await User.insertMany([{
        login: login,
        password: bcrypt.hashSync(password.toString(), 10).toString(),
        name: name,

        grade: grade,
        gradeLetter: gradeLetter,
        group: group,
        attempts: [],
        verdicts: [],

        isTeacher : false
    }]);
}
async function toDo(){

    const workSheetsFromFile = await xlsx.parse(config.PathToUsersList);
    var data = workSheetsFromFile[0].data
    var student, grade, gradeLetter, check;
    for(var i = 1; i < data.length; i++){
        student = data[i];
        if(student.length==0)
            break;
        check = await User.findOne({login:student[0]})
        grade = student[3].slice(0,student[3].length-1);
        gradeLetter = student[3][student[3].length-1];
        if(check){
            check.password = student[2]
            check.name = student[1]
            check.grade = grade
            check.gradeLetter = gradeLetter
            if(!check.group){
                check.group = 1;
            }
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
            await addStudent(student[0], student[2], student[1], grade, gradeLetter, 1)
        }
    }
}

toDo()


setTimeout(() => {
    process.exit()
}, 10000)