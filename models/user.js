const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/db');

const UserScheme = mongoose.Schema({
    login: {
        type : String,
        required : true
    },
    password: {
        type:String,
        required : true
    }
})

const User = module.exports = mongoose.model('User', UserScheme);

module.exports.getUserByLogin = function(login, callback){
    User.findOne({login : login}, callback);
}

module.exports.getUserById = function(id, callback){
    User.findById(id, callback);
}

module.exports.addUser = function(newUser, callback){
    bcrypt.genSalt(10, (err, salt)=>{
        bcrypt.hash(newUser.password, salt, (err, hash) =>{
            if (err) throw err;
            newUser.password = hash;
            newUser.save(callback);
        })
    })
}

module.exports.comparePass = function(passwordFromUser, userDBPass, callback){
    bcrypt.compare(passwordFromUser, userDBPass, (err, isMatch) => {
        if (err) throw err;
        callback(null, isMatch);
    });
}