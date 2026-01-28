import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/dashboard" className="nav-brand">
            Video Platform
          </Link>
          <div className="nav-links">
            <Link to="/dashboard" className="nav-link">
              Dashboard
            </Link>
            <Link to="/videos" className="nav-link">
              Videos
            </Link>
            {(user?.role === 'admin' || user?.role === 'editor') && (
              <Link to="/upload" className="nav-link">
                Upload
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin/users" className="nav-link">
                Admin
              </Link>
            )}
            <div className="nav-user">
              <span className="nav-user-name">{user?.name}</span>
              <span className="nav-user-role">({user?.role})</span>
              <button onClick={handleLogout} className="nav-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
