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
    gradeLetter: String,
    attempts: Array,

    isTeacher: Boolean,
    hasClasses: Array
}, {collection: 'users'});

// Create model from schema
var User = mongoose.model('User', UserSchema );

function addStudent (login, password, name, grade, gradeLetter){
    User.insertMany([{
        login: login,
        password: password,
        name: name,

        grade: grade,
        gradeLetter: gradeLetter,
        attempts: [],

        isTeacher : false
    }]);
}

function addTeacher (login, password, name, hasClasses){
    User.insertMany([{
        login: login,
        password: password,
        name: name,

        attempts: [],
        isTeacher: true,
        hasClasses: hasClasses
    }]);
}
function toDo(){
    addStudent('7А','2', 'Dima', '7', "А")
    addStudent('8Б','2', 'Антон', '8', "Б")
    //addStudent('97','2', 'LzheDima', '12B')
    // addTeacher('0','0', 'admin', ['А12', 'Б12'])
}

toDo()