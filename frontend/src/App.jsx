import { useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ApplyPage from './pages/ApplyPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { isDemoAdminAuthenticated, logoutDemoAdmin } from './storage/adminSession.js';

/** Keep route-level session state synchronized with the shared header. */
function AppRoutes() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => isDemoAdminAuthenticated());

  /** End the demo session and return to the public landing route. */
  function handleLogout() {
    logoutDemoAdmin();
    setAuthenticated(false);
    navigate('/');
  }

  return (
    <div className="app-shell">
      <Header authenticated={authenticated} onLogout={handleLogout} />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apply" element={<ApplyPage />} />
          <Route path="/admin" element={(
            <AdminPage
              authenticated={authenticated}
              onLogin={() => setAuthenticated(true)}
            />
          )} />
          <Route path="*" element={<main className="route-placeholder"><h1>Page not found</h1><a href="/">Return home</a></main>} />
        </Routes>
      </main>
    </div>
  );
}

/** Compose the single client router and shared HireHub page shell. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
