const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Path to store appliance data
const dataFilePath = path.join(__dirname, 'data', 'appliances.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize appliances.json if it doesn't exist
if (!fs.existsSync(dataFilePath)) {
  fs.writeFileSync(dataFilePath, JSON.stringify([]));
}

// Helper function to read appliances
const readAppliances = () => {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading appliances:', error);
    return [];
  }
};

// Helper function to write appliances
const writeAppliances = (appliances) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(appliances, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing appliances:', error);
    return false;
  }
};

// GET all appliances
app.get('/api/appliances', (req, res) => {
  const appliances = readAppliances();
  res.json(appliances);
});

// POST new appliance
app.post('/api/appliances', (req, res) => {
  const { applianceType, name, location, notes, energyData } = req.body;

  // Validate required fields
  if (!applianceType || !name || !location) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const appliances = readAppliances();

  // Create new appliance object - ensure energyData is always an array
  const newAppliance = {
    id: Date.now().toString(),
    applianceType,
    name,
    location,
    notes: notes || '',
    energyData: Array.isArray(energyData) ? energyData : [],
    createdAt: new Date().toISOString(),
  };

  // Add to array
  appliances.push(newAppliance);

  // Save to file
  if (writeAppliances(appliances)) {
    res.status(201).json(newAppliance);
  } else {
    res.status(500).json({ error: 'Failed to save appliance' });
  }
});

// GET appliance by ID
app.get('/api/appliances/:id', (req, res) => {
  const appliances = readAppliances();
  const appliance = appliances.find((a) => a.id === req.params.id);

  if (!appliance) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  res.json(appliance);
});

// PUT update appliance
app.put('/api/appliances/:id', (req, res) => {
  const { applianceType, name, location, notes, energyData } = req.body;
  const appliances = readAppliances();
  const index = appliances.findIndex((a) => a.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  // Update appliance
  appliances[index] = {
    ...appliances[index],
    applianceType: applianceType || appliances[index].applianceType,
    name: name || appliances[index].name,
    location: location || appliances[index].location,
    notes: notes !== undefined ? notes : appliances[index].notes,
    energyData: energyData !== undefined ? energyData : appliances[index].energyData,
    updatedAt: new Date().toISOString(),
  };

  if (writeAppliances(appliances)) {
    res.json(appliances[index]);
  } else {
    res.status(500).json({ error: 'Failed to update appliance' });
  }
});

// DELETE appliance
app.delete('/api/appliances/:id', (req, res) => {
  const appliances = readAppliances();
  const filteredAppliances = appliances.filter((a) => a.id !== req.params.id);

  if (appliances.length === filteredAppliances.length) {
    return res.status(404).json({ error: 'Appliance not found' });
  }

  if (writeAppliances(filteredAppliances)) {
    res.status(204).send();
  } else {
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

