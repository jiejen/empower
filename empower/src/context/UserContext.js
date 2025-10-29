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
        // Get user profile from local auth
        const session = authService.getCurrentSession();
        const userProfile = session?.user || {
          name: firebaseUser.displayName || firebaseUser.email,
          email: firebaseUser.email,
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
    <UserContext.Provider value={{ user, loading, logout }}>
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