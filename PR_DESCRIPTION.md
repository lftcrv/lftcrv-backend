# PR Description: Implement Gated Access System Core

## Overview
This PR implements the complete backend infrastructure for a gated access system, including database schema, API endpoints, and middleware for access code validation and management.

## Changes Implemented

### Database Schema
- Added `AccessCode` entity with all required fields:
  - `id`: string (UUID)
  - `code`: string (securely generated)
  - `createdAt`: Date
  - `expiresAt`: Date (optional)
  - `maxUses`: number (optional)
  - `currentUses`: number
  - `createdBy`: string (optional, for referral tracking)
  - `isActive`: boolean
  - `type`: enum ('ADMIN', 'REFERRAL', 'TEMPORARY')
  - `description`: string (optional, for describing the purpose of the code)
- Updated Prisma schema with the new model
- Created migration for the schema changes

### API Endpoints
Successfully implemented all required endpoints:

1. **POST /api/access-codes/generate**
   - Creates a new access code with specified parameters
   - Supports all required request fields (type, maxUses, expiresAt)
   - Supports optional fields (useShortCode, description)
   - Returns complete AccessCode object with generated code

2. **POST /api/access-codes/validate**
   - Validates an access code against provided userId
   - Handles validation logic (expiration, usage limits, active status)
   - Returns validation status with appropriate error messages

3. **GET /api/access-codes/status**
   - Returns system-wide status of the access code system
   - Includes total codes, active codes, and system enabled status

4. **PUT /api/access-codes/disable**
   - Disables a specific access code by ID
   - Prevents further usage of the code

5. **GET /api/access-codes/stats**
   - Returns detailed statistics about access code usage
   - Includes counts by type, usage patterns, and expiration data

### Middleware Implementation
- Created `AccessCodeMiddleware` to validate access codes
- Implemented system-wide enable/disable functionality
- Added proper error handling and response formatting
- Integrated with existing authentication system

### Security Features
- Implemented rate limiting on validation endpoints (5 requests per 15 minutes)
- Added secure code generation using crypto
- Implemented proper error handling with appropriate HTTP status codes
- Added validation for all request inputs

## Testing
All tests are passing (41 tests total):
- Unit tests for access code generation
- Unit tests for validation logic
- Unit tests for middleware functionality
- Integration tests for all API endpoints
- Integration tests for database operations

## API Documentation
The following endpoints are now available for the frontend to consume:

### Complete Access Code API Endpoints

#### Legacy Endpoints (Maintained for Backward Compatibility)

##### Generate Access Codes
```
POST /api/access-code/generate
```
Description: Generate new access codes (batch generation)

Request:
```json
{
  "count": 5
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "codes": ["a1b2c3", "d4e5f6", "g7h8i9", "j0k1l2", "m3n4o5"]
  }
}
```

##### Verify Access Code
```
POST /api/access-code/verify
```
Description: Verify an access code (simple verification)

Request:
```json
{
  "code": "a1b2c3",
  "clientIp": "192.168.1.1"
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Code verified successfully",
    "remainingAttempts": 5
  }
}
```

##### Get Access Code Metrics
```
GET /api/access-code/metrics
```
Description: Get basic access code usage metrics

Response:
```json
{
  "status": "success",
  "data": {
    "totalCodes": 100,
    "usedCodes": 45,
    "verificationAttempts": 120
  }
}
```

#### New Gated Access System Endpoints

##### Generate a New Access Code
```
POST /api/access-code/access-codes/generate
```
Description: Generate a new access code with detailed configuration options

Request:
```json
{
  "type": "ADMIN", // or "REFERRAL" or "TEMPORARY"
  "maxUses": 10, // optional
  "expiresAt": "2023-12-31T23:59:59Z", // optional
  "useShortCode": true, // optional, generates a 6-character alphanumeric code instead of a long secure code
  "description": "Beta access for marketing team", // optional, describes the purpose of this code
  "count": 5 // optional, generates multiple codes with the same settings (default: 1)
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "123456", // 6-digit code when useShortCode is true
    "createdAt": "2023-06-01T12:00:00Z",
    "expiresAt": "2023-12-31T23:59:59Z",
    "maxUses": 10,
    "currentUses": 0,
    "createdBy": null,
    "isActive": true,
    "type": "ADMIN",
    "description": "Beta access for marketing team"
  }
}
```

When generating multiple codes (using the `count` parameter), the response will include an array of access codes:

```json
{
  "status": "success",
  "data": {
    "accessCodes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "ABC123",
        "createdAt": "2023-06-01T12:00:00Z",
        "expiresAt": "2023-12-31T23:59:59Z",
        "maxUses": 10,
        "currentUses": 0,
        "createdBy": null,
        "isActive": true,
        "type": "ADMIN",
        "description": "Beta access for marketing team"
      },
      {
        "id": "661f9511-f3ac-52e5-b827-557766551111",
        "code": "DEF456",
        "createdAt": "2023-06-01T12:00:00Z",
        "expiresAt": "2023-12-31T23:59:59Z",
        "maxUses": 10,
        "currentUses": 0,
        "createdBy": null,
        "isActive": true,
        "type": "ADMIN",
        "description": "Beta access for marketing team"
      }
      // ... more access codes based on the count parameter
    ]
  }
}
```

##### Validate an Access Code
```
POST /api/access-code/access-codes/validate
```
Description: Validate an access code against a user ID and apply it to the user if valid

Request:
```json
{
  "code": "a1b2c3d4e5f6g7h8i9j0",
  "userId": "user-123"
}
```
Response:
```json
{
  "status": "success",
  "data": {
    "isValid": true,
    "accessCode": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "code": "a1b2c3d4e5f6g7h8i9j0",
      "type": "ADMIN",
      "expiresAt": "2023-12-31T23:59:59Z",
      "maxUses": 10,
      "currentUses": 1,
      "isActive": true,
      "description": "Admin access for development team"
    }
  }
}
```
Or if invalid:
```json
{
  "status": "error",
  "data": {
    "isValid": false,
    "error": "ACCESS_CODE_EXPIRED" // or other error codes
  }
}
```

##### Get Access Code Status
```
GET /api/access-code/access-codes/status/{id}
```
Description: Get the current status of a specific access code by ID

Response:
```json
{
  "status": "success",
  "data": {
    "status": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "isActive": true,
      "currentUses": 3,
      "maxUses": 10,
      "expiresAt": "2023-12-31T23:59:59Z",
      "type": "TEMPORARY",
      "description": "Temporary access for beta testers"
    }
  }
}
```

##### Disable an Access Code
```
PUT /api/access-code/access-codes/disable/{id}
```
Description: Disable a specific access code by ID to prevent further usage

Response:
```json
{
  "status": "success",
  "data": {
    "disabled": true
  }
}
```

##### Get Access Code Statistics
```
GET /api/access-code/access-codes/stats
```
Description: Get comprehensive statistics about all access codes in the system

Response:
```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalCodes": 25,
      "activeCodes": 18,
      "usedCodes": 7,
      "codesByType": {
        "ADMIN": 5,
        "REFERRAL": 12,
        "TEMPORARY": 8
      }
    }
  }
}
```

##### List All Access Codes
```
GET /api/access-code/access-codes/list
```
Description: Retrieve a list of all access codes in the system

Response:
```json
{
  "status": "success",
  "data": {
    "accessCodes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "code": "a1b2c3d4e5f6g7h8i9j0",
        "type": "TEMPORARY",
        "maxUses": 5,
        "currentUses": 0,
        "expiresAt": "2023-12-31T23:59:59.000Z",
        "createdAt": "2023-06-01T12:00:00Z",
        "isActive": true,
        "createdBy": null,
        "description": "Temporary access for beta testers"
      },
      // ... more access codes
    ]
  }
}
```

## Testing with cURL

You can test the API endpoints directly using cURL commands:

### Generate a New Access Code
```bash
curl -X POST http://localhost:8080/api/access-code/access-codes/generate \
  -H "Content-Type: application/json" \
  -H "x-api-key: carbonable-our-giga-secret-api-key" \
  -d '{
    "type": "TEMPORARY",
    "maxUses": 5,
    "expiresAt": "2023-12-31T23:59:59Z",
    "useShortCode": true,
    "description": "Beta access for marketing team",
    "count": 3
  }'
```

### Validate an Access Code
```