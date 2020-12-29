const mongoose = require('mongoose');
const config = require('../../config/db');

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

mongoose.set('useCreateIndex', true);


var UserSchema = new mongoose.Schema({
    login: { 
        type: String, 
        unique: true,
        index: true
    },
    password: String,
    name : String,

    grade: String,
    attempts: Object,

    isTeacher: Boolean,
    hasClasses: Array
});

// Create model from schema
var User = mongoose.model('User', UserSchema );

function addStudent (login, password, name, grade){
    User.insertMany([{
        login: login,
        password: password,
        name: name,

        grade: grade,
        attempts: {},

        isTeacher : false
    }]);
}

async function addTeacher (login, password, name, hasClasses){
    User.insertMany([{
        login: login,
        password: password,
        name: name,

        isTeacher: true,
        hasClasses: hasClasses
    }]);
}
function toDo(){
    addStudent('96','1', 'Dima', '12A')
    addStudent('96','1', 'LzheDima', '12B')
    addTeacher('0','0', 'admin', ['12A', '12B'])
}

toDo()