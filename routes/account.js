const express = require('express');
const router = express.Router();

router.get('/auth', (req, res) => {
    res.send("Страница авторизации")
})

router.get('/dashboard', (req, res) => {
    res.send("Кабинет пользователя")
})

module.exports = router;