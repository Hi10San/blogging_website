import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DottedSurface } from '../components/Dotted-surface';
import { registerUser, saveAuth } from '../lib/api';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(email, password);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess('Account created! Redirecting to login…');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch {
      setError('Could not connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* animated dotted background */}
      <DottedSurface />

      {/* form layer — sits above the canvas */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        {/* glow blob */}
        <div
          Hilo-hidden
          className="pointer-events-none fixed inset-0 flex items-center justify-center"
        >
          <div className="size-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
        </div>

        <div className="relative w-full max-w-md">
          {/* card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
            {/* logo */}
            <div className="mb-8 text-center">
              <span className="font-serif text-3xl font-semibold text-white tracking-wide">
                Hilo<span className="text-purple-400">.</span>
              </span>
              <p className="mt-2 text-sm text-white/40">Create your account</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* confirm */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/50 uppercase tracking-widest">
                  Confirm Password
                </label>
                <input
                  id="signin-confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* error / success */}
              {error && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                  {success}
                </p>
              )}

              {/* submit */}
              <button
                id="signin-submit"
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-purple-600/80 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition-all hover:bg-purple-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            {/* footer link */}
            <p className="mt-6 text-center text-sm text-white/30">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 transition-colors hover:text-purple-300 underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
