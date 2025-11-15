import { userStore } from './userStore';

const SESSION_KEY = 'empower_session';

// Load session from localStorage
const loadSession = () => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
    
    // Check if session is expired
    if (new Date(currentSession.expiresAt) < new Date()) {
      authService.signOut();
      return null;
    }
    
    return currentSession;
  },

  // Update user profile
  updateProfile: async (updates) => {
    if (!currentSession?.user?.id) {
      throw new Error('No authenticated user');
    }

    const profile = userStore.updateUserProfile(currentSession.user.id, updates);
    currentSession.user.profile = profile;
    saveSession(currentSession);
    return profile;
  }
};