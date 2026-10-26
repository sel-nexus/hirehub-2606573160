import { useState } from 'react';
import PropTypes from 'prop-types';
import { loginDemoAdmin } from '../storage/adminSession.js';

const INVALID_CREDENTIALS = 'Invalid credentials. Please try again.';
const ACCESS_UNAVAILABLE = 'Demo access is unavailable because this browser cannot open a session.';

/** Render the explicitly demonstrative, fixed-credential administrator login. */
export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  /** Verify fixed demo credentials and update the parent session state. */
  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (username !== 'admin' || password !== 'admin') {
      setError(INVALID_CREDENTIALS);
      return;
    }
    if (!loginDemoAdmin(username, password)) {
      setError(ACCESS_UNAVAILABLE);
      return;
    }
    onLogin();
  }

  return (
    <section className="admin-access" aria-labelledby="admin-login-title">
      <div className="admin-login-card">
        <p className="admin-login-kicker">HireHub demo access</p>
        <h1 id="admin-login-title">Admin Login</h1>
        <p className="admin-login-copy">Sign in to review submissions saved in this browser.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="admin-username">Username</label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-login-error' : undefined}
            />
          </div>
          {error && <p className="field-error admin-login-error" id="admin-login-error" role="alert">{error}</p>}
          <button className="button button--primary admin-login-submit" type="submit">Login</button>
        </form>
        <p className="admin-demo-note">This fixed demo login is not secure authentication.</p>
      </div>
    </section>
  );
}

AdminLogin.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
