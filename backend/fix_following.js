const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/hi10blog').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({
    email: String, username: String,
    followers: [String], following: [String]
  }));

  const users = await User.find({});

  async function canonicalize(entries) {
    const seen = new Map(); // userId -> canonical username
    for (const entry of entries) {
      const target = await User.findOne({ $or: [{ username: entry }, { email: entry }] });
      if (target) {
        const key = target._id.toString();
        // Prefer username over email
        if (!seen.has(key) || target.username === entry) {
          seen.set(key, target.username || entry);
        }
      } else {
        seen.set('unknown__' + entry, entry);
      }
    }
    return [...seen.values()];
  }

  for (const u of users) {
    const cleanFollowing = await canonicalize(u.following);
    const cleanFollowers = await canonicalize(u.followers);

    const followingChanged = JSON.stringify(cleanFollowing) !== JSON.stringify(u.following);
    const followersChanged = JSON.stringify(cleanFollowers) !== JSON.stringify(u.followers);

    if (followingChanged || followersChanged) {
      if (followingChanged) console.log(`Fixed following for [${u.username || u.email}]: ${JSON.stringify(u.following)} -> ${JSON.stringify(cleanFollowing)}`);
      if (followersChanged) console.log(`Fixed followers for [${u.username || u.email}]: ${JSON.stringify(u.followers)} -> ${JSON.stringify(cleanFollowers)}`);
      u.following = cleanFollowing;
      u.followers = cleanFollowers;
      await u.save();
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
});
