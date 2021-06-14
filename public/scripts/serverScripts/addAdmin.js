const mongoose = require('mongoose');
const config = require('../../../config/configs');
const xlsx = require('node-xlsx').default;
const bcrypt = require('bcryptjs');
const fs = require('fs');

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

var tablePath = process.argv[2];

const User = require('../../../config/models/User');

async function addTeacher(login, password, name, grade, gradeLetter, group) {
  if(!(await User.exists({login: "admin"}))){
    await User.insertMany([{
        login: login,
        password: bcrypt.hashSync(password.toString(), 10).toString(),
        name: name,

        grade: grade,
        gradeLetter: gradeLetter,
        group: group,
        attempts: [],
        verdicts: [],

        isTeacher : true
    }]);
  }
}

addTeacher("admin", "admin", "admin", 0, "a", 0).then(() => { console.log("Done"); process.exit() });