const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3001;

// Firebase imports
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc } = require('firebase/firestore');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Firebase configuration (same as frontend)
const firebaseConfig = {
  apiKey: "AIzaSyD6gQFv9fh5aNfQqn-tl7k2MZZwzMw4DzM",
  authDomain: "cs-4347.firebaseapp.com",
  projectId: "cs-4347",
  storageBucket: "cs-4347.firebasestorage.app",
  messagingSenderId: "858199745674",
  appId: "1:858199745674:web:5fd977ffc2cafe12797973",
  measurementId: "G-D89NRXFC1Z"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Helper function to get user's appliances collection reference
const getUserAppliancesRef = (uid) => {
  return collection(db, 'users', uid, 'appliances');
};

// Helper function to get a specific appliance document reference
const getApplianceRef = (uid, applianceId) => {
  return doc(db, 'users', uid, 'appliances', applianceId);
};

// Helper function to get all appliances for a user
const getUserAppliances = async (uid) => {
  try {
    const appliancesRef = getUserAppliancesRef(uid);
    const snapshot = await getDocs(appliancesRef);
    const appliances = [];
    snapshot.forEach((doc) => {
      appliances.push({ id: doc.id, ...doc.data() });
    });
    return appliances;
  } catch (error) {
    console.error('Error reading appliances from Firestore:', error);
    return [];
  }
};

// Helper function to get a specific appliance
const getAppliance = async (uid, applianceId) => {
  try {
    const applianceRef = getApplianceRef(uid, applianceId);
    const applianceSnap = await getDoc(applianceRef);
    if (applianceSnap.exists()) {
      return { id: applianceSnap.id, ...applianceSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error reading appliance from Firestore:', error);
    return null;
  }
};

// GET all appliances for current user
app.get('/api/appliances', async (req, res) => {
  const uid = req.header('x-user-uid');
  if (!uid) {
    return res.status(401).json({ error: 'Missing user UID' });
  }
  try {
    const appliances = await getUserAppliances(uid);
    res.json(appliances);
  } catch (error) {
    console.error('Error fetching appliances:', error);
    res.status(500).json({ error: 'Failed to fetch appliances' });
  }
});

// POST new appliance
app.post('/api/appliances', async (req, res) => {
  const uid = req.header('x-user-uid');
  if (!uid) {
    return res.status(401).json({ error: 'Missing user UID' });
  }
  const { applianceType, name, location, notes, energyData } = req.body;

  // Validate required fields
  if (!applianceType || !name || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create new appliance object - ensure energyData is always an array
    const newAppliance = {
      applianceType,
      name,
      location,
      notes: notes || '',
      energyData: Array.isArray(energyData) ? energyData : [],
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore
    const appliancesRef = getUserAppliancesRef(uid);
    const docRef = await addDoc(appliancesRef, newAppliance);
    
    // Return the created appliance with the Firestore document ID
    const createdAppliance = { id: docRef.id, ...newAppliance };
    res.status(201).json(createdAppliance);
  } catch (error) {
    console.error('Error creating appliance:', error);
    res.status(500).json({ error: 'Failed to save appliance' });
  }
});

// GET appliance by ID
app.get('/api/appliances/:id', async (req, res) => {
  const uid = req.header('x-user-uid');
  if (!uid) {
    return res.status(401).json({ error: 'Missing user UID' });
  }
  try {
    const appliance = await getAppliance(uid, req.params.id);
    if (!appliance) {
      return res.status(404).json({ error: 'Appliance not found' });
    }
    res.json(appliance);
  } catch (error) {
    console.error('Error fetching appliance:', error);
    res.status(500).json({ error: 'Failed to fetch appliance' });
  }
});

// PUT update appliance
app.put('/api/appliances/:id', async (req, res) => {
  const uid = req.header('x-user-uid');
  if (!uid) {
    return res.status(401).json({ error: 'Missing user UID' });
  }
  const { applianceType, name, location, notes, energyData } = req.body;
  
  try {
    const applianceRef = getApplianceRef(uid, req.params.id);
    const applianceSnap = await getDoc(applianceRef);
    
    if (!applianceSnap.exists()) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    const currentData = applianceSnap.data();
    
    // Build update object with only provided fields
    const updateData = {
      updatedAt: new Date().toISOString(),
    };
    
    if (applianceType !== undefined) updateData.applianceType = applianceType;
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (energyData !== undefined) updateData.energyData = energyData;

    // Update appliance in Firestore
    await updateDoc(applianceRef, updateData);
    
    // Fetch updated appliance
    const updatedAppliance = await getAppliance(uid, req.params.id);
    res.json(updatedAppliance);
  } catch (error) {
    console.error('Error updating appliance:', error);
    res.status(500).json({ error: 'Failed to update appliance' });
  }
});

// DELETE appliance
app.delete('/api/appliances/:id', async (req, res) => {
  const uid = req.header('x-user-uid');
  if (!uid) {
    return res.status(401).json({ error: 'Missing user UID' });
  }
  
  try {
    const applianceRef = getApplianceRef(uid, req.params.id);
    const applianceSnap = await getDoc(applianceRef);
    
    if (!applianceSnap.exists()) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    // Delete appliance from Firestore
    await deleteDoc(applianceRef);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting appliance:', error);
    res.status(500).json({ error: 'Failed to delete appliance' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

