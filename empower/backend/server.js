const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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

// Helper function to parse CSV data
const parseCSVData = (csvContent) => {
  try {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    
    const energyData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      energyData.push(row);
    }
    return energyData;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

// POST new appliance (with optional CSV file)
app.post('/api/appliances', upload.fields([
  { name: 'csv', maxCount: 1 }
]), (req, res) => {
  try {
    const { applianceType, name, location, notes } = req.body;
    console.log('Received appliance data:', { applianceType, name, location, notes });
    console.log('Files:', req.files);

    // Validate required fields
    if (!applianceType || !name || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appliances = readAppliances();

  // Create new appliance object
  const newAppliance = {
    id: Date.now().toString(),
    applianceType,
    name,
    location,
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  // Process CSV file if provided
  if (req.files && req.files.csv && req.files.csv[0]) {
    try {
      const csvFile = req.files.csv[0];
      const csvContent = fs.readFileSync(csvFile.path, 'utf8');
      const energyData = parseCSVData(csvContent);
      
      if (energyData.length > 0) {
        newAppliance.energyData = energyData;
        newAppliance.dataLastUploaded = new Date().toISOString();
      }

      // Clean up uploaded file
      fs.unlinkSync(csvFile.path);
    } catch (error) {
      console.error('Error processing CSV file:', error);
      // Continue without energy data if CSV processing fails
    }
  }

  // Add to array
  appliances.push(newAppliance);

    // Save to file
    if (writeAppliances(appliances)) {
      res.status(201).json(newAppliance);
    } else {
      res.status(500).json({ error: 'Failed to save appliance' });
    }
  } catch (error) {
    console.error('Error in POST /api/appliances:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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
  const { applianceType, name, location, notes } = req.body;
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

// POST upload energy data CSV for an appliance
app.post('/api/appliances/upload-data', upload.single('csv'), (req, res) => {
  const { applianceId } = req.body;

  if (!applianceId || !req.file) {
    return res.status(400).json({ error: 'Missing appliance ID or CSV file' });
  }

  try {
    // Read appliances
    const appliances = readAppliances();
    const applianceIndex = appliances.findIndex((a) => a.id === applianceId);

    if (applianceIndex === -1) {
      return res.status(404).json({ error: 'Appliance not found' });
    }

    // Read and parse CSV file
    const csvContent = fs.readFileSync(req.file.path, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    
    // Parse CSV data
    const energyData = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      energyData.push(row);
    }

    // Attach energy data to appliance
    if (!appliances[applianceIndex].energyData) {
      appliances[applianceIndex].energyData = [];
    }
    appliances[applianceIndex].energyData = energyData;
    appliances[applianceIndex].dataLastUploaded = new Date().toISOString();

    // Save appliances
    if (writeAppliances(appliances)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      res.json({ message: 'Energy data uploaded successfully', dataPoints: energyData.length });
    } else {
      res.status(500).json({ error: 'Failed to save energy data' });
    }
  } catch (error) {
    console.error('Error processing CSV:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

