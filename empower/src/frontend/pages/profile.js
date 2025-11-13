import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
import { authService } from '../../services/authService';
import { db, auth } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import '../components/Layout.css';

const formatPhoneNumber = (value) => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Limit to 10 digits
  const limited = digits.slice(0, 10);
  
  // Format as +1 (XXX) XXX-XXXX
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `+1 (${limited}`;
  if (limited.length <= 6) return `+1 (${limited.slice(0, 3)}) ${limited.slice(3)}`;
  return `+1 (${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
};

function Profile() {
  const { user, logout, updateUser } = useUser();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    photoURL: ''
  });
  const [editedInfo, setEditedInfo] = useState(userInfo);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const loadUserData = async () => {
      let firestoreData = {};
      
      // Try to load from Firestore if user is authenticated with Firebase
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            firestoreData = userDoc.data();
          }
        } catch (error) {
          console.log('Error loading from Firestore:', error);
        }
      }

      const initialInfo = {
        name: firestoreData.name || user.name || user.email?.split('@')[0] || '',
        email: user.email || '',
        phone: firestoreData.phone || user.phone || '',
        city: firestoreData.city || user.city || '',
        state: firestoreData.state || user.state || '',
        photoURL: user.photoURL || ''
      };
      setUserInfo(initialInfo);
      setEditedInfo(initialInfo);
    };

    loadUserData();
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
        city: editedInfo.city,
        state: editedInfo.state
      };
      
      // Save to Firestore if user is authenticated with Firebase
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDocRef, {
            ...updates,
            email: user.email,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error('Error saving to Firestore:', error);
          throw new Error('Failed to save to database');
        }
      }
      
      // Update in local storage if user has an ID
      if (user.id) {
        try {
          await authService.updateProfile(updates);
        } catch (err) {
          console.log('Local storage update skipped:', err.message);
        }
      }
      
      // Update the context
      updateUser(updates);
      setUserInfo({ ...editedInfo });
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
    if (field === 'phone') {
      setEditedInfo({ ...editedInfo, [field]: formatPhoneNumber(value) });
    } else {
      setEditedInfo({ ...editedInfo, [field]: value });
    }
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

          {userInfo.photoURL && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <img 
                src={userInfo.photoURL} 
                alt="Profile" 
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #28a745'
                }}
              />
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
                  backgroundColor: '#28a745',
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
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
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
                    backgroundColor: '#28a745',
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
                  placeholder="+1 (XXX) XXX-XXXX"
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
                  {userInfo.phone || 'Not provided'}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                City
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedInfo.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter your city"
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
                  {userInfo.city || 'Not provided'}
                </p>
              )}
            </div>

            {/* State */}
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                State
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedInfo.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Enter your state"
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
                  {userInfo.state || 'Not provided'}
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