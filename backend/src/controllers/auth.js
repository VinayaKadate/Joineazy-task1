const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../models/db');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(400).json({ error: 'User with this email already exists' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userRole = role === 'admin' ? 'admin' : 'student';

    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, password_hash, userRole]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    res.status(201).json({ message: 'User registered successfully', token, user: newUser });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    delete user.password_hash;

    res.json({ message: 'Logged in successfully', token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential, role } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential token is required' });

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if a user with this Google ID or email already exists
    let result = await db.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [googleId, email]);
    let user;

    if (result.rows.length > 0) {
      // Existing user — update google_id if they previously signed up with email/password
      user = result.rows[0];
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1, auth_provider = $2 WHERE id = $3', [googleId, 'google', user.id]);
        user.google_id = googleId;
        user.auth_provider = 'google';
      }
    } else {
      // New user — create account with Google profile data
      const userRole = role === 'admin' ? 'admin' : 'student';
      const insertResult = await db.query(
        'INSERT INTO users (name, email, google_id, auth_provider, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
        [name, email, googleId, 'google', userRole]
      );
      user = insertResult.rows[0];
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    delete user.password_hash;

    res.json({ message: 'Logged in with Google successfully', token, user });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ error: 'Server error during Google login' });
  }
};

module.exports = { register, login, googleLogin };

