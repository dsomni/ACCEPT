const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport')
const jwt = require('jsonwebtoken')
const config = require('../config/db');
const user = require('../models/user');


router.get('/auth', (req, res) =>{
    res.render('login.ejs');
});

router.post('/auth', (req, res) => {
    User.getUserByLogin(req.body.login, (err, user) =>{
        if (err) throw err;
        if(!user) return res.json({success : false, msg : "Пользователь не найден"});
        
    });

    User.comparePass(req.body.password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch){
            const token =  jwt.sign(user, config.secret, {expiresIn : 7200});
            res.json({
                success : true,
                token : 'JWT ' + token,
                user : {
                    id : user._id,
                    login: user.login
                }
            });
        } else return res.json({success : false, msg : "Не верный логин/пароль"});
    });
})

router.get('/dashboard', passport.authenticate('jwt', {session : false}), (req, res) => {
    res.send("Кабинет пользователя")
})

module.exports = router;