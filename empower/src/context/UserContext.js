import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../firebase';
import { authService } from '../services/authService';

const UserContext = createContext();

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Handle automatic logout due to inactivity
  const handleInactivityLogout = useCallback(async () => {
    console.log('User logged out due to inactivity');
    try {
      await auth.signOut();
      authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Auto-logout error:', error);
    }
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    authService.updateLastActivity();

    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Set new timer only if user is logged in
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        handleInactivityLogout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [user, handleInactivityLogout]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  // Check for session timeout on mount and visibility change
  useEffect(() => {
    const checkSessionTimeout = () => {
      if (user) {
        const session = authService.getCurrentSession();
        if (!session) {
          // Session expired while tab was hidden
          handleInactivityLogout();
        }
      }
    };

    // Check immediately on mount
    checkSessionTimeout();

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSessionTimeout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, handleInactivityLogout]);

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
        authService.updateLastActivity(); // Update activity timestamp
      } else {
        const session = authService.getCurrentSession();
        if (session?.user) {
          setUser(session.user);
          authService.updateLastActivity();
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
      // Clear inactivity timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
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