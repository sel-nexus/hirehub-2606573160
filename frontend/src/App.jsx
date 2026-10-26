import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';

/** Compose the single client router and shared HireHub page shell. */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Header />
        <main id="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/admin" element={<main className="route-placeholder"><h1>Admin Login</h1><p>The demo administrator area is being prepared.</p></main>} />
            <Route path="*" element={<main className="route-placeholder"><h1>Page not found</h1><a href="/">Return home</a></main>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
