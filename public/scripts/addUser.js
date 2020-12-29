const mongoose = require('mongoose');

//MongoDB connecting  
mongoose.connect(config.db,{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
mongoose.connection.on('connected', () => {
    console.log("Successfully connected to DB");
});
mongoose.connection.on('error', (err) => {
    console.log("Error while connecting to DB: "+ err);
});


var UserSchema = new mongoose.Schema({
    login: String,
    password: String
});

// Create model from schema
var User = mongoose.model('User', UserSchema );

function addUser (login,password){
    User.insertMany([{
        login: login,
        password: password
    }])
}