# User Management API Documentation

## Base URL
```
/api/users
```

## Authentication
All endpoints require an API key to be passed in the headers:
```
X-API-KEY: your-api-key
```

## Endpoints

### 1. User Connection
Use this endpoint when a user connects to automatically update their last connection time.

**Endpoint:** `POST /api/users/connect`

**Request Body:**
```json
{
  "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
      "addressType": "DERIVED",
      "twitterHandle": "@username",
      "lastConnection": "2024-01-24T10:00:00.000Z",
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T10:00:00.000Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

**Error Response (404):**
```json
{
  "message": "No user found with this Starknet address",
  "error": "Not Found",
  "statusCode": 404
}
```

### 2. Create User
Create a new user with their wallet information.

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
  "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
  "addressType": "DERIVED",
  "twitterHandle": "@username",
  "accessCode": "CODE123"
}
```

**Validation Rules:**
- `starknetAddress`: Required, must start with '0x' followed by 1-64 hex characters
- `evmAddress`: Optional, must be '0x' followed by exactly 40 hex characters
- `addressType`: Required, must be either "NATIVE" or "DERIVED"
- `twitterHandle`: Optional, must start with '@' followed by 1-15 alphanumeric/underscore characters
- `accessCode`: Optional, used for referral tracking

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
      "addressType": "DERIVED",
      "twitterHandle": "@username",
      "lastConnection": null,
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T09:41:32.348Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

**Error Responses:**

Invalid Data (400):
```json
{
  "message": "Invalid user data provided",
  "error": "Bad Request",
  "statusCode": 400,
  "details": [
    {
      "field": "starknetAddress",
      "error": "Invalid Starknet address format"
    }
  ]
}
```

Duplicate Address (400):
```json
{
  "message": "Starknet address already registered",
  "error": "Bad Request",
  "statusCode": 400
}
```

Invalid Access Code (400):
```json
{
  "message": "Invalid or expired access code",
  "error": "Bad Request",
  "statusCode": 400
}
```

### 3. Update User
Update an existing user's information.

**Endpoint:** `PUT /api/users/:id`

**Request Body:**
```json
{
  "evmAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "twitterHandle": "@newusername"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "addressType": "DERIVED",
      "twitterHandle": "@newusername",
      "lastConnection": "2024-01-24T10:00:00.000Z",
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T10:00:00.000Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

### 4. Query Endpoints

#### Get All Users
**Endpoint:** `GET /api/users`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "id": "clh2d0f9s0000qw3v8jqw1q1q",
        "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
        "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
        "addressType": "DERIVED",
        "twitterHandle": "@username",
        "lastConnection": "2024-01-24T09:41:32.348Z",
        "createdAt": "2024-01-24T09:41:32.348Z",
        "updatedAt": "2024-01-24T09:41:32.348Z",
        "usedReferralCode": "CODE123"
      }
      // ... more users
    ]
  }
}
```

#### Get User by ID
**Endpoint:** `GET /api/users/:id`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
      "addressType": "DERIVED",
      "twitterHandle": "@username",
      "lastConnection": "2024-01-24T09:41:32.348Z",
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T09:41:32.348Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

#### Get User by Starknet Address
**Endpoint:** `GET /api/users/starknet/:address`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
      "addressType": "DERIVED",
      "twitterHandle": "@username",
      "lastConnection": "2024-01-24T09:41:32.348Z",
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T09:41:32.348Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

#### Get User by EVM Address
**Endpoint:** `GET /api/users/evm/:address`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "clh2d0f9s0000qw3v8jqw1q1q",
      "starknetAddress": "0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5",
      "evmAddress": "0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e",
      "addressType": "DERIVED",
      "twitterHandle": "@username",
      "lastConnection": "2024-01-24T09:41:32.348Z",
      "createdAt": "2024-01-24T09:41:32.348Z",
      "updatedAt": "2024-01-24T09:41:32.348Z",
      "usedReferralCode": "CODE123"
    }
  }
}
```

## Error Responses

### Not Found (404)
```json
{
  "message": "User with ID clh2d0f9s0000qw3v8jqw1q1q not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### Bad Request (400)
```json
{
  "message": "Invalid user data provided",
  "error": "Bad Request",
  "statusCode": 400
}
```

### Unauthorized (401)
```json
{
  "message": "Invalid API key",
  "error": "Unauthorized",
  "statusCode": 401
}
``` 