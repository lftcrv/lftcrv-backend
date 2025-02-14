# Agent Details Endpoint

## Endpoint
```
GET /api/eliza-agent/:id
```

## Description
Retrieves comprehensive information about a specific agent, including its token details, market data, and profile picture information.

## Authentication
Requires API key in headers:
```
x-api-key: your-api-key
```

## Response Structure
```typescript
{
  "status": "success",
  "data": {
    "agent": {
      // Basic Agent Info
      "id": string,
      "name": string,
      "curveSide": "LEFT" | "RIGHT",
      "creatorWallet": string,
      "status": "STARTING" | "RUNNING" | "STOPPED" | "FAILED" | "ERROR",
      "deploymentFeesTxHash": string,
      "characterConfig": object,
      "degenScore": number,
      "winScore": number,
      "createdAt": string,
      "updatedAt": string,

      // Profile Picture
      "profilePicture": string | null,
      "profilePictureUrl": string | null,

      // Market Data
      "latestMarketData": {
        "price": number,
        "priceChange24h": number,
        "holders": number,
        "marketCap": number,
        "bondingStatus": "BONDING" | "LIVE"
      },

      // Token Information
      "token": {
        "id": string,
        "token": string,
        "symbol": string,
        "contractAddress": string,
        "buyTax": number,
        "sellTax": number
      },

      // Wallet Information
      "wallet": {
        "contractAddress": string,
        "deployedAddress": string | null,
        "fundTransactionHash": string | null,
        "deployTransactionHash": string | null
      }
    }
  }
}
```

## Example Response
```json
{
  "status": "success",
  "data": {
    "agent": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Trading Bot Alpha",
      "curveSide": "LEFT",
      "creatorWallet": "0x1234...",
      "status": "RUNNING",
      "deploymentFeesTxHash": "0xabcd...",
      "characterConfig": {
        "personality": "aggressive",
        "strategy": "momentum"
      },
      "degenScore": 85,
      "winScore": 92,
      "createdAt": "2024-02-13T10:52:42.778Z",
      "updatedAt": "2024-02-13T10:52:42.778Z",
      "profilePicture": "123e4567-e89b-12d3-a456-426614174000.png",
      "profilePictureUrl": "/uploads/profile-pictures/123e4567-e89b-12d3-a456-426614174000.png",
      "latestMarketData": {
        "price": 0.5,
        "priceChange24h": 0.1,
        "holders": 150,
        "marketCap": 75000,
        "bondingStatus": "LIVE"
      },
      "token": {
        "id": "token-123",
        "token": "Trading Bot Alpha Token",
        "symbol": "ALPHA",
        "contractAddress": "0xdef5...",
        "buyTax": 5,
        "sellTax": 5
      },
      "wallet": {
        "contractAddress": "0x9876...",
        "deployedAddress": "0x5432...",
        "fundTransactionHash": "0xfund...",
        "deployTransactionHash": "0xdeploy..."
      }
    }
  }
}
```

## Important Notes
1. All timestamps are in ISO 8601 format
2. Profile picture URL is relative to your API base URL
3. Market data is real-time when the request is made
4. Token amounts and prices are returned as numbers (not strings)
5. Character config structure may vary based on agent type

## Error Responses
- `404 Not Found`: Agent with the specified ID doesn't exist
- `401 Unauthorized`: Invalid or missing API key
- `500 Internal Server Error`: Server-side error

## Common Use Cases
1. **Agent Details Page**: Full agent information display
2. **Token Dashboard**: Market and trading information
3. **Profile Management**: Agent status and configuration
4. **Performance Tracking**: Degen and win scores monitoring

## Additional Token-Specific Endpoints

### 1. Current Price
```
GET /api/agent-token/:agentId/current-price
```
Returns the current price of the agent's token.

Response:
```json
{
  "status": "success",
  "data": {
    "price": "0.5" // String to handle large numbers accurately
  }
}
```

### 2. Bonding Curve Percentage
```
GET /api/agent-token/:agentId/bonding-curve-percentage
```
Returns the current bonding curve percentage (indicates progress in bonding curve).

Response:
```json
{
  "status": "success",
  "data": {
    "percentage": 75 // Number between 0-100
  }
}
```

### 3. Market Cap
```
GET /api/agent-token/:agentId/market-cap
```
Returns the current market capitalization of the token.

Response:
```json
{
  "status": "success",
  "data": {
    "marketCap": "75000" // String to handle large numbers accurately
  }
}
```

### 4. Price History
```
GET /api/agent-token/:agentId/price-history
```
Returns historical price data (limited to last 5000 prices).

Response:
```json
{
  "status": "success",
  "data": {
    "prices": [
      {
        "id": "price-id",
        "price": "0.5",
        "timestamp": "2024-02-13T10:52:42.778Z"
      }
      // ... more price entries
    ],
    "tokenSymbol": "ALPHA",
    "tokenAddress": "0xdef5..."
  }
}
```

### 5. Market Overview
You can get market data in two ways:

#### Option 1: From Main Agent Endpoint
```
GET /api/eliza-agent/:id
```
The `latestMarketData` section of the response contains all market information:
```json
{
  "status": "success",
  "data": {
    "agent": {
      "latestMarketData": {
        "price": 0.5,
        "priceChange24h": 0.1,
        "holders": 150,
        "marketCap": 75000,
        "bondingStatus": "BONDING" | "LIVE"
      }
    }
  }
}
```

#### Option 2: Using Latest Market Data
```
GET /api/agent-token/:agentId/latest-market-data
```
A focused endpoint that returns just the market data:
```json
{
  "status": "success",
  "data": {
    "price": "0.5",
    "marketCap": "75000",
    "holders": 150,
    "priceChange24h": "0.1",
    "bondingStatus": "BONDING"
  }
}
```

**Note**: Option 1 returns numbers for these values, while Option 2 returns strings for large numbers (price, marketCap) to maintain precision. Choose based on your precision needs.

**Use Cases**:
- Token price widgets
- Market overview panels
- Quick market status checks
- Real-time price monitoring

**Advantages of Option 2**:
1. Lighter payload (only market data)
2. Better precision for large numbers
3. Faster response time
4. More suitable for frequent polling

### Common Notes for Token Endpoints
1. All endpoints require API key authentication
2. All endpoints return `404` if agent or token not found
3. Numerical values that can be large are returned as strings
4. Timestamps are in ISO 8601 format
5. Price history is limited to prevent performance issues

### Error Responses for All Token Endpoints
```json
{
  "status": "error",
  "message": "Error message here"
}
```

Common error codes:
- `401`: Invalid or missing API key
- `404`: Agent or token not found
- `500`: Internal server error

### Use Cases for Specific Endpoints
1. **Current Price**: Real-time price display, trading interfaces
2. **Bonding Curve**: Progress indicators, bonding phase tracking
3. **Market Cap**: Token statistics, market analysis
4. **Price History**: Charts, trend analysis, performance tracking