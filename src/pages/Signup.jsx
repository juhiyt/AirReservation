import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authClient } from '../api/authClient.js';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: err } = await authClient.signUp.email({
      name: form.name,
      email: form.email,
      password: form.password,
    });
    setSubmitting(false);
    if (err) return setError(err.message ?? 'Could not create your account.');
    navigate(location.state?.returnTo ?? '/', { replace: true });
  };

  return (
    <div className="auth-card">
      <h1>Create an account</h1>
      <form onSubmit={submit}>
        <label>
          Full name
          <input required value={form.name} onChange={set('name')} />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>
          Password
          <input type="password" required minLength={8} value={form.password} onChange={set('password')} />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Sign up'}</button>
      </form>
      <p>Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
    </div>
  );
}
