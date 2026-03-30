const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
// Permissive CORS — allows ALL origins, methods, and headers.
// This fixes "Failed to fetch" when opening HTML files directly in the browser.
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight OPTIONS requests globally
app.options('*', cors());

app.use(express.json());

// --- DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hi10blog';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Hi10 Database Connected → ' + MONGO_URI))
    .catch(err => console.error('❌ Database connection error:', err));

// --- DATA MODELS ---

const UserSchema = new mongoose.Schema({
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const PostSchema = new mongoose.Schema({
    title:          { type: String, required: true },
    content:        { type: String, required: true },
    author:         { type: String, default: 'Hi10 Editor' },
    date:           { type: Date, default: Date.now },
    animationStyle: { type: String, enum: ['writing', 'pointing', 'holding'], default: 'writing' }
});
const Post = mongoose.model('Post', PostSchema);

// --- JWT MIDDLEWARE ---
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'HI10_SECRET_KEY_2024');
        next();
    } catch {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// --- HEALTH CHECK ---
// Visit http://localhost:5000/api/health to confirm server is running
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Hi10 server is running',
        dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        time: new Date().toISOString()
    });
});

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ error: 'An account with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();

        console.log('New user registered: ' + email);
        res.status(201).json({ message: 'Account created successfully.' });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ error: 'No account found with that email.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(400).json({ error: 'Incorrect password. Please try again.' });

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'HI10_SECRET_KEY_2024',
            { expiresIn: '24h' }
        );

        console.log('User logged in: ' + email);
        res.json({ token, user: { email: user.email, id: user._id, createdAt: user.createdAt } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// --- ADMIN: Get all users (passwords excluded) ---
// Used by admin.html — in production, protect this with verifyToken
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
        res.json({ count: users.length, users });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// --- BLOG ROUTES ---

app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

app.post('/api/posts', verifyToken, async (req, res) => {
    try {
        const newPost = new Post({ ...req.body, author: req.user.email });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create post.' });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\nHi10 Server running   -> http://localhost:' + PORT);
    console.log('Health check          -> http://localhost:' + PORT + '/api/health');
    console.log('View all users        -> http://localhost:' + PORT + '/api/users\n');
});