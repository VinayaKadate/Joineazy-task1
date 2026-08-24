const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// POST /auth/google
router.post('/google', authController.googleLogin);

module.exports = router;

