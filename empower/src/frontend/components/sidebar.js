import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, LogOut, UserCircle, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Layout.css';
import logo from '../assets/logo.png';

export const Navbar = ({ userName = 'User name', onLogout, activePage = 'Dashboard' }) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState(false);
  const [isAppliancesDropdownOpen, setIsAppliancesDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const reportsDropdownRef = useRef(null);
  const appliancesDropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
        setIsReportsDropdownOpen(false);
      }
      if (appliancesDropdownRef.current && !appliancesDropdownRef.current.contains(event.target)) {
        setIsAppliancesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(false);
    navigate('/profile');
  };

  const handleCostDataClick = () => {
    setIsProfileDropdownOpen(false);
    navigate('/cost-data');
  };

  const handleLogout = async () => {
    setIsProfileDropdownOpen(false);
    try {
      await onLogout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  return (
    <div className="navbar">
      {/* Left: Logo and App Name */}
      <div className="navbar-brand">
        <img src={logo} alt="Empower Logo" style={{ height: '40px', marginRight: '-4px', transform: 'rotate(220deg)' }} />
        <span className="app-name">Empower</span>
      </div>

      {/* Center: Navigation Menu */}
      <nav className="navbar-menu">
        <button 
          className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>

        {/* Reports Dropdown */}
        <div className="nav-dropdown" ref={reportsDropdownRef}>
          <button 
            className={`nav-item ${activePage === 'Reports' || activePage === 'Create Report' ? 'active' : ''}`}
            onClick={() => setIsReportsDropdownOpen(!isReportsDropdownOpen)}
          >
            Reports
            <ChevronDown size={16} className={`nav-chevron ${isReportsDropdownOpen ? 'open' : ''}`} />
          </button>
          {isReportsDropdownOpen && (
            <div className="nav-dropdown-menu">
              <button className="nav-dropdown-item" onClick={() => { navigate('/reports'); setIsReportsDropdownOpen(false); }}>
                All Reports
              </button>
              <button className="nav-dropdown-item" onClick={() => { navigate('/create-report'); setIsReportsDropdownOpen(false); }}>
                Create Report
              </button>
            </div>
          )}
        </div>

        {/* Appliances Dropdown */}
        <div className="nav-dropdown" ref={appliancesDropdownRef}>
          <button 
            className={`nav-item ${activePage === 'Appliances' || activePage === 'Add Appliance' ? 'active' : ''}`}
            onClick={() => setIsAppliancesDropdownOpen(!isAppliancesDropdownOpen)}
          >
            Appliances
            <ChevronDown size={16} className={`nav-chevron ${isAppliancesDropdownOpen ? 'open' : ''}`} />
          </button>
          {isAppliancesDropdownOpen && (
            <div className="nav-dropdown-menu">
              <button className="nav-dropdown-item" onClick={() => { navigate('/appliances'); setIsAppliancesDropdownOpen(false); }}>
                All Appliances
              </button>
              <button className="nav-dropdown-item" onClick={() => { navigate('/add-appliance'); setIsAppliancesDropdownOpen(false); }}>
                Add Appliance
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Right: User Profile */}
      <div className="user-profile" ref={profileDropdownRef}>
        <button 
          className="user-profile-btn"
          onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
        >
          <div className="user-avatar">
            <User size={20} />
          </div>
          <span className="user-name">{userName}</span>
          <ChevronDown 
            size={18} 
            className={`dropdown-icon ${isProfileDropdownOpen ? 'open' : ''}`}
          />
        </button>

        {isProfileDropdownOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleProfileClick}>
              <UserCircle size={18} />
              <span>Profile</span>
            </button>
            <button className="dropdown-item" onClick={handleCostDataClick}>
              <DollarSign size={18} />
              <span>Cost Data</span>
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