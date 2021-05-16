const mongoose = require('mongoose');
const config = require('../../config/configs');
const xlsx = require('node-xlsx').default;
const bcrypt = require('bcryptjs');

//MongoDB connecting
var connectionString
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName
}

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoose.connection.on('connected', () => {
    console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
    console.log("Error while connecting to DB: " + err);
});

mongoose.set('useCreateIndex', true);

const User = require('../../config/models/User');

async function addStudent(login, password, name, grade, gradeLetter, group) {
    await User.insertMany([{
        login: login,
        password: bcrypt.hashSync(password.toString(), 10).toString(),
        name: name,

        grade: grade,
        gradeLetter: gradeLetter,
        group: group,
        attempts: [],
        verdicts: [],

        isTeacher: false
    }]);
}
async function toDo() {

    const workSheetsFromFile = await xlsx.parse(config.PathToDeleteUsersList);
    var data = workSheetsFromFile[0].data
    var student, grade, gradeLetter, check;
    for (var i = 1; i < data.length; i++) {
        student = data[i];
        if (student.length == 0)
            break;
        check = await User.deleteOne({login : student[0]});
    }
}

toDo().then(() => { console.log("Done"); process.exit() }).catch((err)=>console.log(err));