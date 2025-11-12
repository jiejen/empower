# Backend Server

This is the backend server for the Empower application.

## Features

- RESTful API for managing appliances
- Firestore cloud database integration
- CRUD operations for appliances
- User-based data isolation

## API Endpoints

### GET /api/appliances
Get all appliances for the authenticated user.

**Headers:**
- `x-user-uid`: User's Firebase UID (required)

**Response:**
```json
[
  {
    "id": "abc123",
    "applianceType": "Refrigerator",
    "name": "Kitchen Fridge",
    "location": "Kitchen",
    "notes": "Energy efficient",
    "energyData": [],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/appliances
Create a new appliance for the authenticated user.

**Headers:**
- `x-user-uid`: User's Firebase UID (required)

**Request Body:**
```json
{
  "applianceType": "Refrigerator",
  "name": "Kitchen Fridge",
  "location": "Kitchen",
  "notes": "Energy efficient",
  "energyData": []
}
```

**Response:** Created appliance object with Firestore document ID and timestamps.

### GET /api/appliances/:id
Get a specific appliance by ID for the authenticated user.

**Headers:**
- `x-user-uid`: User's Firebase UID (required)

### PUT /api/appliances/:id
Update an existing appliance for the authenticated user.

**Headers:**
- `x-user-uid`: User's Firebase UID (required)

**Request Body:**
```json
{
  "applianceType": "Refrigerator",
  "name": "Updated Name",
  "location": "Kitchen",
  "notes": "Updated notes",
  "energyData": []
}
```

### DELETE /api/appliances/:id
Delete an appliance by ID for the authenticated user.

**Headers:**
- `x-user-uid`: User's Firebase UID (required)

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

Appliance data is stored in **Firestore** (Google Cloud Firestore). Each user's appliances are stored in a subcollection under their user document:
- Collection: `users/{uid}/appliances`
- Each appliance is a document with fields: `applianceType`, `name`, `location`, `notes`, `energyData`, `createdAt`, `updatedAt`

## Firebase Configuration

The backend uses the same Firebase configuration as the frontend. Make sure your Firebase project is properly configured with Firestore enabled.

## Authentication

All API endpoints require a user UID to be passed in the `x-user-uid` header. This ensures data isolation between users.
