import React, { useContext, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import api from '../utils/api';
import { 
  Home, 
  Search, 
  PlusSquare, 
  MessageSquare, 
  Bell, 
  User, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { unreadNotificationsCount } = useContext(SocketContext);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navigate = useNavigate();

  // Fetch unread messages count from conversations
  const fetchUnreadMessages = async () => {
    if (!user) return;
    try {
      const res = await api.get('/chat/');
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      const totalUnread = list.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadMessages(totalUnread);
    } catch (err) {
      console.error('Failed to fetch unread messages count', err);
    }
  };

  useEffect(() => {
    fetchUnreadMessages();
    
    // Poll for message counts periodically to keep badge fresh
    const interval = setInterval(fetchUnreadMessages, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <aside className="sidebar-container glass-panel">
      <div className="sidebar-brand">
        <span className="brand-text">InstaGlass</span>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home className="nav-icon" />
          <span className="link-text">Home</span>
        </NavLink>
        
        <NavLink to="/explore" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Search className="nav-icon" />
          <span className="link-text">Explore</span>
        </NavLink>
        
        <NavLink to="/create" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <PlusSquare className="nav-icon" />
          <span className="link-text">Create</span>
        </NavLink>
        
        <NavLink to="/chat" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <div className="nav-icon-wrapper">
            <MessageSquare className="nav-icon" />
            {unreadMessages > 0 && (
              <span className="badge-count">{unreadMessages}</span>
            )}
          </div>
          <span className="link-text">Messages</span>
        </NavLink>
        
        <NavLink to="/notifications" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <div className="nav-icon-wrapper">
            <Bell className="nav-icon" />
            {unreadNotificationsCount > 0 && (
              <span className="badge-count">{unreadNotificationsCount}</span>
            )}
          </div>
          <span className="link-text">Notifications</span>
        </NavLink>
        
        <NavLink to={`/profile/${user.username}`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <User className="nav-icon" />
          <span className="link-text">Profile</span>
        </NavLink>
      </nav>
      
      <button className="sidebar-logout sidebar-link" onClick={handleLogout}>
        <LogOut className="nav-icon" />
        <span className="link-text">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
