const BASE = import.meta.env.VITE_API_URL || 'https://blogging-website-4hj6.onrender.com/api';

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(email: string, password: string, username?: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });
  return res.json();
}

export function saveAuth(token: string, user: any) {
  localStorage.setItem('hi10_token', token);
  localStorage.setItem('hi10_user', JSON.stringify(user));
}

export function getAuth() {
  const token = localStorage.getItem('hi10_token');
  const userStr = localStorage.getItem('hi10_user');
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
}

export function clearAuth() {
  localStorage.removeItem('hi10_token');
  localStorage.removeItem('hi10_user');
}

export async function fetchPosts(searchQuery?: string) {
  const url = searchQuery 
    ? `${BASE}/posts?search=${encodeURIComponent(searchQuery)}`
    : `${BASE}/posts`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchPost(id: string) {
  const res = await fetch(`${BASE}/posts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export async function searchUsers(query: string) {
  const res = await fetch(`${BASE}/users/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search users');
  return res.json();
}

export async function createPost(data: { title: string; content: string; animationStyle?: string; tags?: string[]; cover?: string | null; status?: string }) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || 'Failed to create post');
  }
  return res.json();
}

export async function fetchUserPosts() {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/posts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to fetch user posts');
  return res.json();
}

export async function deletePost(id: string) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Failed to delete post');
  return res.json();
}

export async function updateProfile(username: string) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to update profile');
  }
  return res.json();
}

export async function toggleFollow(username: string) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/follow/${username}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to toggle follow');
  }
  return res.json();
}

export async function fetchNotifications() {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationsRead() {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/notifications/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export async function fetchFollowing() {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/following`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch following list');
  return res.json();
}

export async function fetchFollowers() {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/followers`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch followers list');
  return res.json();
}

export async function removeFollower(username: string) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/user/followers/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to remove follower');
  }
  return res.json();
}

export async function fetchUserProfile(username: string) {
  const res = await fetch(`${BASE}/user/profile/${encodeURIComponent(username)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function fetchUserPublicPosts(username: string) {
  const res = await fetch(`${BASE}/posts?author=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}