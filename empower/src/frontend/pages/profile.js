import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { authService } from '../../services/authService';
import '../components/Layout.css';

function Profile() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    location: ''
  });
  const [editedInfo, setEditedInfo] = useState(userInfo);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const initialInfo = {
      name: user.name || user.email?.split('@')[0] || '',
      email: user.email || '',
      phone: user.phone || '',
      location: user.location || ''
    };
    setUserInfo(initialInfo);
    setEditedInfo(initialInfo);
  }, [user, navigate]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedInfo(userInfo);
    setError('');
  };

  const handleSave = async () => {
    try {
      setError('');
      const updates = {
        name: editedInfo.name,
        phone: editedInfo.phone,
        location: editedInfo.location
      };
      
      await authService.updateProfile(updates);
      setUserInfo(editedInfo);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditedInfo(userInfo);
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setEditedInfo({ ...editedInfo, [field]: value });
  };

  return (
    <Layout activePage="Profile" userName={user?.name || user?.email || 'User'} onLogout={logout}>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          border: '1px solid #e5e7eb',
          padding: '32px'
        }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              marginBottom: '24px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
              Profile Information
            </h2>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Name */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedInfo.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
                  {userInfo.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedInfo.email}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none',
                    backgroundColor: '#f3f4f6',
                    cursor: 'not-allowed'
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
                  {userInfo.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editedInfo.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
                  {userInfo.phone}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Location
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedInfo.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              ) : (
                <p style={{ margin: 0, color: '#1f2937', fontSize: '16px' }}>
                  {userInfo.location}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Profile;