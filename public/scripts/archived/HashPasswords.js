const bcrypt = require('bcryptjs');
const config = require('../../../config/configs');
const mongoose = require('mongoose');

let connectionString;
if (config.mongodbConfigs.User.Username != "" && config.mongodbConfigs.User.Password != "") {
    connectionString = "mongodb://" + config.mongodbConfigs.User.Username + ":" + config.mongodbConfigs.User.Password + "@" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName;
} else {
    connectionString = "mongodb://" + config.mongodbConfigs.Host + "/" + config.mongodbConfigs.dbName;
};

mongoose.connect(connectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.connection.on('connected', () => {
    console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
    console.log("Error while connecting to DB: " + err);
});

const User = require('../../../config/models/User');

async function go() {
    let users = await User.find({}).exec();
    for (let i = 0; i < users.length; i++){
        users[i].password = bcrypt.hashSync(users[i].password, 10);
        users[i].save();
    }
}

go();

setTimeout(() => {
    process.exit()
}, 10000)