const mongoose = require('mongoose');
const config = require('../../../config/configs');
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

const User = require('../../../config/models/User');

async function toDo() {

    const workSheetsFromFile = await xlsx.parse(config.PathToDeleteUsersList);
    var data = workSheetsFromFile[0].data
    var student;
    for (var i = 1; i < data.length; i++) {
        student = data[i];
        if (student.length == 0)
            break;
        childProcess.exec(`node ${path.join(__dirname, '../fixes/FixAfterDeleteUser.js')} ${student[0]} ${1}`)
        setTimeout(() =>
            console.log(`user ${student[0]} deleted `),
        500)
    }
}

toDo().then(() => { console.log("Done"); process.exit() }).catch((err)=>console.log(err));