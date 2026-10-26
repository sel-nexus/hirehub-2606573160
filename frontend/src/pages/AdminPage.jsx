import { useState } from 'react';
import AdminLogin from '../components/AdminLogin.jsx';
import SubmissionDashboard from '../components/SubmissionDashboard.jsx';
import { isDemoAdminAuthenticated } from '../storage/adminSession.js';

/** Gate the demo administrator route using the exact tab session value. */
export default function AdminPage({ authenticated: authenticatedProp, onLogin }) {
  const [localAuthenticated, setLocalAuthenticated] = useState(() => isDemoAdminAuthenticated());
  const isAuthenticated = typeof authenticatedProp === 'boolean' ? authenticatedProp : localAuthenticated;

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => {
      setLocalAuthenticated(true);
      onLogin?.();
    }} />;
  }

  return <SubmissionDashboard />;
}
