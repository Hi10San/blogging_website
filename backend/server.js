const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE ---
app.use(cors()); // Allows frontend to talk to backend
app.use(express.json()); // Allows backend to read JSON data

// --- DATABASE CONNECTION ---
// Change 'hi10blog' to whatever you want your database named
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hi10blog';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Hi10 Database Connected Locally'))
    .catch(err => console.error('❌ Database connection error:', err));

// --- DATA MODELS ---

// User Model (For Login/Signup)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// Blog Post Model (With Animation Logic)
const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, default: 'Hi10 Editor' },
    date: { type: Date, default: Date.now },
    // This allows the frontend to know which hand animation to play
    animationStyle: { type: String, enum: ['writing', 'pointing', 'holding'], default: 'writing' }
});
const Post = mongoose.model('Post', PostSchema);

// --- API ROUTES ---

// 1. AUTH: Register a new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User Created" });
    } catch (error) {
        res.status(400).json({ error: "Registration failed. Email might exist." });
    }
});

// 2. AUTH: Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, 'HI10_SECRET_KEY_2024', { expiresIn: '24h' });
    res.json({ token, user: { email: user.email } });
});

// 3. BLOG: Get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await Post.find().sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch posts" });
    }
});

// 4. BLOG: Create a post (Protected later with middleware)
app.post('/api/posts', async (req, res) => {
    try {
        const newPost = new Post(req.body);
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(400).json({ error: "Failed to create post" });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Hi10 Server running on: http://localhost:${PORT}`);
});