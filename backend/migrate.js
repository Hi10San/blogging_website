const mongoose = require('mongoose');
const MONGO_URI = 'mongodb://127.0.0.1:27017/hi10blog';

const UserSchema = new mongoose.Schema({
    email:     { type: String, required: true },
    username:  { type: String },
});
const User = mongoose.model('User', UserSchema);

const PostSchema = new mongoose.Schema({
    author: { type: String }
});
const Post = mongoose.model('Post', PostSchema);

async function run() {
    await mongoose.connect(MONGO_URI);
    const users = await User.find({});
    for (let u of users) {
        if (u.username) {
            await Post.updateMany({ author: u.email }, { author: u.username });
        } else {
            // Give them a default username from their email
            const newUsername = u.email.split('@')[0];
            await User.findByIdAndUpdate(u._id, { username: newUsername });
            await Post.updateMany({ author: u.email }, { author: newUsername });
        }
    }
    console.log("Done");
    process.exit(0);
}
run();
