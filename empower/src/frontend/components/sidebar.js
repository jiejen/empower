import React, { useState } from 'react';
import { Search, X, User } from 'lucide-react';
import './Layout.css';

// Sidebar Component
export const Sidebar = ({ activePage = 'Dashboard', onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'create-report', label: 'Create Report' },
    { id: 'add-appliance', label: 'Add Appliance' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h1>EMPOWER</h1>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            className={`sidebar-item ${activePage === item.label ? 'active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn">Log Out</button>
      </div>
    </div>
  );
};

// Navbar Component
export const Navbar = ({ userName = 'User name' }) => {
  const [searchValue, setSearchValue] = useState('');

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

      <div className="user-profile">
        <div className="user-avatar">
          <User size={24} />
        </div>
        <span className="user-name">{userName}</span>
      </div>
    </div>
  );
};