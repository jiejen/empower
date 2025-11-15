import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { Layout } from '../components/layout';
import { useUser } from '../../context/UserContext';
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
  const { user, loading: authLoading, logout, updateUser } = useUser();
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
    if (authLoading) return; // Wait for auth to complete
    
    if (!user) {
      navigate('/');
      return;
    }

    const loadUserData = async () => {
      let firestoreData = {};
      
      // Try to load from Firestore
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            firestoreData = userDoc.data();
          } else {
            // Create initial user document if it doesn't exist
            const initialData = {
              email: auth.currentUser.email,
              name: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || '',
              photoURL: auth.currentUser.photoURL || '',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, initialData);
            firestoreData = initialData;
          }
        } catch (error) {
          console.error('Error loading from Firestore:', error);
        }
      }

      // Prioritize Firestore data, then Firebase auth, then user context
      const initialInfo = {
        name: firestoreData.name || auth.currentUser?.displayName || user.name || user.email?.split('@')[0] || '',
        email: auth.currentUser?.email || user.email || '',
        phone: firestoreData.phone || auth.currentUser?.phoneNumber || user.phone || '',
        city: firestoreData.city || user.city || '',
        state: firestoreData.state || user.state || '',
        photoURL: auth.currentUser?.photoURL || firestoreData.photoURL || user.photoURL || ''
      };
      setUserInfo(initialInfo);
      setEditedInfo(initialInfo);
    };

    loadUserData();
  }, [user, navigate, authLoading]);

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
      
      // Save to Firestore (works for both Google and email/password users)
      if (auth.currentUser) {
        try {
          const userDocRef = doc(db, 'users', auth.currentUser.uid);
          await setDoc(userDocRef, {
            ...updates,
            email: auth.currentUser.email,
            photoURL: auth.currentUser.photoURL || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('Profile saved to Firestore successfully');
        } catch (error) {
          console.error('Error saving to Firestore:', error);
          throw new Error('Failed to save to database');
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

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            {userInfo.photoURL ? (
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
            ) : (
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                backgroundColor: '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                border: '3px solid #28a745'
              }}>
                <User size={50} strokeWidth={2} />
              </div>
            )}
          </div>

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
                className="profile-edit-btn"
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCancel}
                  className="profile-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="profile-save-btn"
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