import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authClient } from '../api/authClient.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: err } = await authClient.signIn.email({ email: form.email, password: form.password });
    setSubmitting(false);
    if (err) return setError(err.message ?? 'Could not sign in.');
    navigate(location.state?.returnTo ?? '/', { replace: true });
  };

  return (
    <div className="auth-card">
      <h1>Sign in</h1>
      <form onSubmit={submit}>
        <label>
          Email
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>
          Password
          <input type="password" required value={form.password} onChange={set('password')} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p>No account? <Link to="/signup" state={location.state}>Sign up</Link></p>
    </div>
  );
}
