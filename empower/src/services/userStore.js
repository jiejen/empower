// Simulated user store
const USER_STORAGE_KEY = 'empower_users';

// Load existing users from localStorage
const loadUsers = () => {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Save users to localStorage
const saveUsers = (users) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
};

// Initialize with any existing users or empty array
let users = loadUsers();

export const userStore = {
  // Create new user
  createUser: (email, password) => {
    // Check if user already exists
    if (users.some(u => u.email === email)) {
      throw new Error('User already exists');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      throw new Error('Password must contain at least one special character (!@#$%^&*)');
    }

    // Create user object
    const newUser = {
      id: Date.now().toString(),
      email,
      password, // In a real app, this would be hashed!
      createdAt: new Date().toISOString(),
      profile: {
        name: email.split('@')[0], // Default name from email
        avatar: null,
        preferences: {}
      }
    };

    // Add to users array and save
    users.push(newUser);
    saveUsers(users);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Authenticate user
  authenticateUser: (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Update user profile
  updateUserProfile: (userId, updates) => {
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error('User not found');
    }

    // Update only allowed fields
    const allowedUpdates = ['name', 'avatar', 'preferences'];
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        users[index].profile[key] = updates[key];
      }
    });

    saveUsers(users);
    return users[index].profile;
  },

  // Delete user account
  deleteUser: (userId) => {
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      throw new Error('User not found');
    }

    users.splice(index, 1);
    saveUsers(users);
  }
};