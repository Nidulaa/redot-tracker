import { useState } from 'react';
import { signIn } from '../auth.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // onAuthStateChange in App picks up the new session automatically.
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="dot"></span>
          <h1>Redot Global</h1>
        </div>
        <p className="login-sub">Maintenance Tracker</p>

        <div className={'login-error' + (error ? ' show' : '')}>{error}</div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-foot">Internal use only · Redot Global</p>
      </div>
    </div>
  );
}
