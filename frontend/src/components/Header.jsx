import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Apply', to: '/apply' },
  { label: 'Admin', to: '/admin' },
];

/** Render the shared HireHub navigation and its current-route state. */
export default function Header({ authenticated = false, onLogout }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink className="site-brand" to="/" aria-label="HireHub home">
          HireHub
        </NavLink>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `primary-nav__link${isActive ? ' is-active' : ''}`}
              to={item.to}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        {authenticated ? (
          <button className="header-action header-action--logout" type="button" onClick={onLogout}>
            Logout
          </button>
        ) : (
          <NavLink className="header-action header-action--login" to="/admin">
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
}

Header.propTypes = {
  authenticated: PropTypes.bool,
  onLogout: PropTypes.func,
};
