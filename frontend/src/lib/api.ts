const BASE = 'http://localhost:5000/api';

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
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

export async function fetchPosts() {
  const res = await fetch(`${BASE}/posts`);
  return res.json();
}

export async function fetchPost(id: string) {
  const res = await fetch(`${BASE}/posts/${id}`);
  return res.json();
}

export async function createPost(data: { title: string; content: string; animationStyle?: string }) {
  const { token } = getAuth();
  const res = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return res.json();
}