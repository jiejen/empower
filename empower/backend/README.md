# Backend Server

This is the backend server for the Empower application.

## Features

- RESTful API for managing appliances
- JSON-based file storage (data/appliances.json)
- CRUD operations for appliances

## API Endpoints

### GET /api/appliances
Get all appliances.

**Response:**
```json
[
  {
    "id": "123456789",
    "applianceType": "Refrigerator",
    "name": "Kitchen Fridge",
    "location": "Kitchen",
    "notes": "Energy efficient",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/appliances
Create a new appliance.

**Request Body:**
```json
{
  "applianceType": "Refrigerator",
  "name": "Kitchen Fridge",
  "location": "Kitchen",
  "notes": "Energy efficient"
}
```

**Response:** Created appliance object with ID and timestamps.

### GET /api/appliances/:id
Get a specific appliance by ID.

### PUT /api/appliances/:id
Update an existing appliance.

**Request Body:**
```json
{
  "applianceType": "Refrigerator",
  "name": "Updated Name",
  "location": "Kitchen",
  "notes": "Updated notes"
}
```

### DELETE /api/appliances/:id
Delete an appliance by ID.

### GET /api/health
Health check endpoint.

## Running the Server

```bash
npm run backend
```

## Development

Run both frontend and backend together:

```bash
npm install
npm run dev
```

The backend runs on `http://localhost:3001`.
The frontend runs on `http://localhost:3000`.

## Data Storage

Appliance data is stored in `backend/data/appliances.json`. This file is automatically created on first run.

