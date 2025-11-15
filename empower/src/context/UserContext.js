import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { authService } from '../services/authService';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Get user profile from local auth or create from Firebase data
        const session = authService.getCurrentSession();
        const userProfile = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || session?.user?.name || firebaseUser.email?.split('@')[0] || '',
          email: firebaseUser.email,
          phone: firebaseUser.phoneNumber || session?.user?.phone || '',
          photoURL: firebaseUser.photoURL || '',
          location: session?.user?.location || '',
          profile: session?.user?.profile || {}
        };

        setUser(userProfile);
      } else {
        const session = authService.getCurrentSession();
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUser = (updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const logout = async () => {
    try {
      // Sign out from Firebase
      await auth.signOut();
      // Clear local auth
      authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}