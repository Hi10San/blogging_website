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
    username:  { type: String, unique: true, sparse: true }, // Optional initially, but unique
    followers: [{ type: String }], // Array of usernames
    following: [{ type: String }], // Array of usernames
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const NotificationSchema = new mongoose.Schema({
    username: { type: String, required: true }, // The user receiving the notification
    message:  { type: String, required: true },
    read:     { type: Boolean, default: false },
    blogId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    createdAt:{ type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', NotificationSchema);

const PostSchema = new mongoose.Schema({
    title:          { type: String, required: true },
    content:        { type: String, required: true },
    author:         { type: String, default: 'Hi10 Editor' },
    date:           { type: Date, default: Date.now },
    animationStyle: { type: String, enum: ['writing', 'pointing', 'holding'], default: 'writing' },
    tags:           { type: [String], default: [] },
    cover:          { type: String, default: null },
    views:          { type: Number, default: 0 },
    status:         { type: String, enum: ['Draft', 'Published'], default: 'Published' }
});
const Post = mongoose.model('Post', PostSchema);

// --- JWT MIDDLEWARE ---
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
        console.error('Auth error: No token provided');
        return res.status(401).json({ error: 'You must be logged in to publish a blog.' });
    }
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'HI10_SECRET_KEY_2024');
        next();
    } catch (err) {
        console.error('Auth error: Invalid token:', err.message);
        res.status(403).json({ error: 'Your session has expired. Please log in again.' });
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
        const { email, password, username } = req.body;

        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ error: 'An account with this email already exists.' });

        let finalUsername = username;
        if (!finalUsername) {
            finalUsername = email.split('@')[0];
            let counter = 1;
            while (await User.findOne({ username: finalUsername })) {
                finalUsername = `${email.split('@')[0]}${counter}`;
                counter++;
            }
        } else {
            const usernameExists = await User.findOne({ username: finalUsername });
            if (usernameExists)
                return res.status(400).json({ error: 'This username is already taken.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ email, password: hashedPassword, username: finalUsername });
        await newUser.save();

        console.log('New user registered: ' + email + (username ? ' as ' + username : ''));
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
            { id: user._id, email: user.email, username: user.username },
            process.env.JWT_SECRET || 'HI10_SECRET_KEY_2024',
            { expiresIn: '24h' }
        );

        console.log('User logged in: ' + email);
        res.json({ token, user: { email: user.email, id: user._id, username: user.username, followers: user.followers, following: user.following, createdAt: user.createdAt } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// --- PROFILE & FOLLOW ROUTES ---

// Update Profile (username)
app.put('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || username.trim() === '') return res.status(400).json({ error: 'Username cannot be empty.' });
        
        // Check if taken
        const exists = await User.findOne({ username });
        if (exists && exists._id.toString() !== req.user.id) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }

        const user = await User.findByIdAndUpdate(req.user.id, { username }, { new: true });
        
        if (req.user.username && req.user.username !== username) {
            await Post.updateMany({ author: req.user.username }, { author: username });
        }
        
        // Generate new token to include username
        const token = jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            process.env.JWT_SECRET || 'HI10_SECRET_KEY_2024',
            { expiresIn: '24h' }
        );
        res.json({ token, user: { email: user.email, id: user._id, username: user.username, followers: user.followers, following: user.following } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Toggle Follow User
app.post('/api/user/follow/:username', verifyToken, async (req, res) => {
    try {
        const targetUsername = req.params.username;
        const currentUser = await User.findById(req.user.id);
        
        if (!currentUser.username) {
            return res.status(400).json({ error: 'You must set a username before following others.' });
        }
        if (targetUsername === currentUser.username || targetUsername === currentUser.email) {
            return res.status(400).json({ error: 'You cannot follow yourself.' });
        }

        // Look up by username OR email (since older blogs use email as author)
        const targetUser = await User.findOne({ $or: [{ username: targetUsername }, { email: targetUsername }] });
        if (!targetUser) return res.status(404).json({ error: 'User not found.' });

        // Deduplicate existing arrays first (fix stale data)
        currentUser.following = [...new Set(currentUser.following)];
        targetUser.followers = [...new Set(targetUser.followers)];

        const isFollowing = currentUser.following.includes(targetUsername);

        if (isFollowing) {
            // Unfollow
            currentUser.following = currentUser.following.filter(u => u !== targetUsername);
            targetUser.followers = targetUser.followers.filter(u => u !== currentUser.username);
        } else {
            // Follow — only add if not already present
            if (!currentUser.following.includes(targetUsername)) currentUser.following.push(targetUsername);
            if (!targetUser.followers.includes(currentUser.username)) targetUser.followers.push(currentUser.username);

            // Notify target user
            await new Notification({
                username: targetUser.username || targetUser.email,
                message: `${currentUser.username} started following you.`
            }).save();
        }

        await currentUser.save();
        await targetUser.save();

        res.json({ isFollowing: !isFollowing, followersCount: [...new Set(targetUser.followers)].length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to follow user.' });
    }
});

// Get Following List
app.get('/api/user/following', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        // Deduplicate to fix any stale duplicate entries
        const uniqueFollowing = [...new Set(currentUser.following)];
        if (uniqueFollowing.length !== currentUser.following.length) {
            currentUser.following = uniqueFollowing;
            await currentUser.save();
        }

        const followingUsers = await User.find({ username: { $in: uniqueFollowing } }, 'username followers following');

        const followingData = followingUsers.map(u => ({
            username: u.username,
            followersCount: [...new Set(u.followers)].length,
            followingCount: [...new Set(u.following)].length
        }));

        res.json(followingData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch following list.' });
    }
});

// Get Followers List (users who follow the current user)
app.get('/api/user/followers', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        // Deduplicate to fix any stale duplicate entries
        const uniqueFollowers = [...new Set(currentUser.followers)];
        if (uniqueFollowers.length !== currentUser.followers.length) {
            currentUser.followers = uniqueFollowers;
            await currentUser.save();
        }

        const followerUsers = await User.find({ username: { $in: uniqueFollowers } }, 'username followers following');

        const followerData = followerUsers.map(u => ({
            username: u.username,
            followersCount: [...new Set(u.followers)].length,
            followingCount: [...new Set(u.following)].length
        }));

        res.json(followerData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch followers list.' });
    }
});

// Remove a follower (force-unfollow — the follower is removed from my followers list and I am removed from their following list)
app.delete('/api/user/followers/:username', verifyToken, async (req, res) => {
    try {
        const followerUsername = req.params.username;
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) return res.status(404).json({ error: 'User not found' });

        // Remove from my followers
        currentUser.followers = currentUser.followers.filter(u => u !== followerUsername);
        await currentUser.save();

        // Remove me from their following list
        const followerUser = await User.findOne({ username: followerUsername });
        if (followerUser) {
            followerUser.following = followerUser.following.filter(u => u !== currentUser.username);
            await followerUser.save();
        }

        res.json({ success: true, followersCount: currentUser.followers.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to remove follower.' });
    }
});

// Search users by username
app.get('/api/users/search', async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) return res.json([]);
        const regex = new RegExp(q.trim(), 'i');
        const users = await User.find({ username: regex }, 'username followers following').limit(20);
        res.json(users.map(u => ({
            username: u.username,
            followersCount: [...new Set(u.followers)].length,
            followingCount: [...new Set(u.following)].length,
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to search users.' });
    }
});

// Get Public User Profile
app.get('/api/user/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username }, 'username followers following');
        if (!user) return res.status(404).json({ error: 'User not found.' });

        // Deduplicate arrays before counting to fix stale duplicate data
        const uniqueFollowers = [...new Set(user.followers)];
        const uniqueFollowing = [...new Set(user.following)];

        res.json({
            username: user.username,
            followersCount: uniqueFollowers.length,
            followingCount: uniqueFollowing.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

// Get Notifications
app.get('/api/notifications', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser.username) return res.json([]);
        
        const notifications = await Notification.find({ username: currentUser.username }).sort({ createdAt: -1 }).limit(20);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// Mark notifications read
app.post('/api/notifications/read', verifyToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (currentUser.username) {
            await Notification.updateMany({ username: currentUser.username, read: false }, { read: true });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark read.' });
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
        let filter = {};
        if (req.query.search) {
            const regex = new RegExp(req.query.search, 'i');
            filter = { $or: [{ author: regex }, { title: regex }] };
        }
        if (req.query.author) {
            filter.author = req.query.author;
        }
        const posts = await Post.find(filter).sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Fetch posts error:', error);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// Get a specific post by ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }
        res.json(post);
    } catch (error) {
        console.error('Fetch single post error:', error);
        res.status(500).json({ error: 'Failed to fetch post.' });
    }
});

app.post('/api/posts', verifyToken, async (req, res) => {
    try {
        let authorName = req.user.username;
        if (!authorName) {
            const u = await User.findById(req.user.id);
            authorName = u.username;
        }
        const newPost = new Post({ ...req.body, author: authorName });
        await newPost.save();
        
        // Notify followers
        const user = await User.findById(req.user.id);
        if (user && user.followers && user.followers.length > 0) {
            const notifications = user.followers.map(followerUsername => ({
                username: followerUsername,
                message: `${authorName} published a new blog: "${newPost.title}"`,
                blogId: newPost._id
            }));
            await Notification.insertMany(notifications);
        }
        
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Failed to create post:', error);
        res.status(400).json({ error: 'Failed to create post.', details: error.message });
    }
});

// Get user's specific posts
app.get('/api/user/posts', verifyToken, async (req, res) => {
    try {
        let username = req.user.username;
        if (!username) {
            const user = await User.findById(req.user.id);
            if (user) username = user.username;
        }
        if (!username) return res.json([]);
        const posts = await Post.find({ author: username }).sort({ date: -1 });
        res.json(posts);
    } catch (error) {
        console.error('Fetch user posts error:', error);
        res.status(500).json({ error: 'Failed to fetch user posts.' });
    }
});

// Delete a post
app.delete('/api/posts/:id', verifyToken, async (req, res) => {
    try {
        let authorName = req.user.username;
        if (!authorName) {
            const u = await User.findById(req.user.id);
            authorName = u.username;
        }
        const post = await Post.findOneAndDelete({ _id: req.params.id, author: authorName });
        if (!post) {
            return res.status(404).json({ error: 'Post not found or unauthorized.' });
        }
        res.json({ message: 'Post deleted successfully.' });
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('\nHi10 Server running   -> http://localhost:' + PORT);
    console.log('Health check          -> http://localhost:' + PORT + '/api/health');
    console.log('View all users        -> http://localhost:' + PORT + '/api/users\n');
});