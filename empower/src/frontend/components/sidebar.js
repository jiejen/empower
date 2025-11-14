import React, { useState, useRef, useEffect } from 'react';
import { Search, X, User, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Layout.css';

// Sidebar Component
export const Sidebar = ({ activePage = 'Dashboard', onLogout }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'appliances', label: 'Appliances', path: '/appliances' },
    { id: 'reports', label: 'Reports', path: '/reports' },
    { id: 'create-report', label: 'Create Report', path: '/create-report' },
    { id: 'add-appliance', label: 'Add Appliance', path: '/add-appliance' }
  ];

  const handleLogout = async () => {
    try {
      await onLogout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>EMPOWER</h1>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`sidebar-item ${activePage === item.label ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
};

export const Navbar = ({ userName = 'User name', onLogout }) => {
  const [searchValue, setSearchValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    onLogout();
  };

  return (
    <div className="navbar">
      <div className="search-container">
        <div className="search-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="search-input"
          />
          {searchValue && (
            <button onClick={() => setSearchValue('')} className="clear-btn">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="user-profile" ref={dropdownRef}>
        <button 
          className="user-profile-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <div className="user-avatar">
            <User size={24} />
          </div>
          <span className="user-name">{userName}</span>
          <ChevronDown 
            size={20} 
            className={`dropdown-icon ${isDropdownOpen ? 'open' : ''}`}
          />
        </button>

        {isDropdownOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleProfileClick}>
              <UserCircle size={18} />
              <span>Profile</span>
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};