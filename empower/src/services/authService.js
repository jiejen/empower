import { userStore } from './userStore';

const SESSION_KEY = 'empower_session';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Load session from localStorage
const loadSession = () => {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  try {
    const session = JSON.parse(stored);
    
    // Check if session has expired due to inactivity
    if (session.lastActivity) {
      const timeSinceLastActivity = Date.now() - new Date(session.lastActivity).getTime();
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        // Session expired due to inactivity
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
    }
    
    return session;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
};

// Save session to localStorage
const saveSession = (session) => {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Initialize with any existing session
let currentSession = loadSession();

export const authService = {
  // Sign up new user
  signUp: async (email, password) => {
    try {
      const user = userStore.createUser(email, password);
      currentSession = {
        user,
        token: btoa(`${email}:${Date.now()}`), // Simple token generation
        lastActivity: new Date().toISOString()
      };
      saveSession(currentSession);
      return currentSession;
    } catch (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }
  },

  // Sign in existing user
  signIn: async (email, password) => {
    try {
      const user = userStore.authenticateUser(email, password);
      currentSession = {
        user,
        token: btoa(`${email}:${Date.now()}`),
        lastActivity: new Date().toISOString()
      };
      saveSession(currentSession);
      return currentSession;
    } catch (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }
  },

  // Sign out current user
  signOut: () => {
    currentSession = null;
    saveSession(null);
  },

  // Get current session
  getCurrentSession: () => {
    if (!currentSession) return null;
    
    // Check if session has expired due to inactivity
    if (currentSession.lastActivity) {
      const timeSinceLastActivity = Date.now() - new Date(currentSession.lastActivity).getTime();
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        authService.signOut();
        return null;
      }
    }
    
    return currentSession;
  },

  // Update last activity timestamp
  updateLastActivity: () => {
    if (currentSession) {
      currentSession.lastActivity = new Date().toISOString();
      saveSession(currentSession);
    }
  },

  // Update user profile
  updateProfile: async (updates) => {
    if (!currentSession?.user?.id) {
      throw new Error('No authenticated user');
    }

    const profile = userStore.updateUserProfile(currentSession.user.id, updates);
    currentSession.user.profile = profile;
    currentSession.lastActivity = new Date().toISOString();
    saveSession(currentSession);
    return profile;
  }
};