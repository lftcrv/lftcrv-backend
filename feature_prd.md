# Feature: Creators Domain API Documentation

**Parent Feature:** Creator Management & Performance Tracking (#88)
**Related Issues:** #88, #90, #91

## 1. Overview

This document provides details for frontend developers on how to interact with the Creators domain API endpoints. These endpoints allow retrieving information about creators, their agents, performance summaries, and the global creator leaderboard.

## 2. Authentication

All endpoints within the `/api/creators` path require API key authentication. Include your API key in the `x-api-key` header for all requests.

**Example Header:**

```
x-api-key: YOUR_SECRET_API_KEY
```

**Error Response (401 Unauthorized):** If the API key is missing or invalid.

## 3. Common DTOs

These DTOs are used across multiple endpoints for pagination and standardized responses.

**3.1. `PageQueryDto` (Query Parameters)**

Used for endpoints that support pagination.

-   `page` (number, optional, default: 1): The page number to retrieve (starts at 1).
-   `limit` (number, optional, default: 10): The number of items to retrieve per page (max: 100).

**3.2. `PaginatedResponseDto<T>` (Response Body)**

The standard structure for responses containing paginated data.

-   `data` (T[]): An array of items for the current page (the type `T` depends on the endpoint).
-   `total` (number): The total number of items available across all pages.
-   `page` (number): The current page number.
-   `limit` (number): The number of items requested per page.

---

## 4. Endpoints

### 4.1. Get All Creators

Retrieves a paginated list of all unique creators, identified by their wallet addresses, along with the count of agents they have created.

-   **Purpose:** Display a list of creators on the platform.
-   **Method:** `GET`
-   **Path:** `/api/creators`
-   **Authentication:** Required (`x-api-key` header)
-   **Request Query Parameters:** `PageQueryDto` (`page`, `limit`)
-   **Success Response (200 OK):** `PaginatedResponseDto<CreatorDto>`
    -   `data`: Array of `CreatorDto` objects.
        -   `creatorId` (string): The creator's wallet address.
        -   `agentCount` (number): The total number of agents created by this creator.
-   **Error Responses:**
    -   `401 Unauthorized`

**Example Usage:**

```bash
curl -X GET "http://127.0.0.1:8080/api/creators?page=1&limit=20" \
     -H "x-api-key: YOUR_SECRET_API_KEY" | jq .
```

### 4.2. Get Creator by ID

Retrieves basic information about a specific creator using their wallet address.

-   **Purpose:** Get details for a specific creator profile page.
-   **Method:** `GET`
-   **Path:** `/api/creators/{creatorId}`
-   **Authentication:** Required (`x-api-key` header)
-   **Request Path Parameter:**
    -   `creatorId` (string): The wallet address of the creator.
-   **Success Response (200 OK):** `CreatorDto`
    -   `creatorId` (string): The creator's wallet address.
    -   `agentCount` (number): The total number of agents created by this creator.
-   **Error Responses:**
    -   `401 Unauthorized`
    -   `404 Not Found`: If no creator exists with the given `creatorId` (i.e., no agents associated).

**Example Usage:**

```bash
curl -X GET "http://127.0.0.1:8080/api/creators/0xSomeCreatorWalletAddress" \
     -H "x-api-key: YOUR_SECRET_API_KEY" | jq .
```

### 4.3. Get Agents by Creator ID

Retrieves a paginated list of agents created by a specific creator.

-   **Purpose:** List the agents belonging to a specific creator.
-   **Method:** `GET`
-   **Path:** `/api/creators/{creatorId}/agents`
-   **Authentication:** Required (`x-api-key` header)
-   **Request Path Parameter:**
    -   `creatorId` (string): The wallet address of the creator.
-   **Request Query Parameters:** `PageQueryDto` (`page`, `limit`)
-   **Success Response (200 OK):** `PaginatedResponseDto<AgentSummaryDto>`
    -   `data`: Array of `AgentSummaryDto` objects.
        -   `id` (string): The agent's unique ID.
        -   `name` (string): The agent's name.
        -   `status` (enum: `STARTING`, `RUNNING`, `STOPPED`, `FAILED`, `ERROR`): The current status of the agent.
        -   `createdAt` (Date): The timestamp when the agent was created.
-   **Error Responses:**
    -   `401 Unauthorized`
    -   `404 Not Found`: If no creator exists with the given `creatorId`.

**Example Usage:**

```bash
curl -X GET "http://127.0.0.1:8080/api/creators/0xSomeCreatorWalletAddress/agents?page=1&limit=10" \
     -H "x-api-key: YOUR_SECRET_API_KEY" | jq .
```

### 4.4. Get Creator Performance Summary

Retrieves an aggregated performance summary for a specific creator, including overall metrics and details for each of their agents.

-   **Purpose:** Display detailed performance metrics on a creator's profile page.
-   **Method:** `GET`
-   **Path:** `/api/creators/{creatorId}/performance`
-   **Authentication:** Required (`x-api-key` header)
-   **Request Path Parameter:**
    -   `creatorId` (string): The wallet address of the creator.
-   **Success Response (200 OK):** `CreatorPerformanceSummaryDto` (See detailed DTO definition below)
-   **Error Responses:**
    -   `401 Unauthorized`
    -   `404 Not Found`: If no creator exists with the given `creatorId`.

**Example Usage:**

```bash
curl -X GET "http://127.0.0.1:8080/api/creators/0xSomeCreatorWalletAddress/performance" \
     -H "x-api-key: YOUR_SECRET_API_KEY" | jq .
```

### 4.5. Get Creator Leaderboard

Retrieves a paginated and sortable list of creators ranked by aggregated performance metrics.

-   **Purpose:** Display a global leaderboard of creators.
-   **Method:** `GET`
-   **Path:** `/api/creators/leaderboard`
-   **Authentication:** Required (`x-api-key` header)
-   **Request Query Parameters:** `LeaderboardQueryDto`
    -   `page` (number, optional, default: 1)
    -   `limit` (number, optional, default: 10)
    -   `sortBy` (enum, optional, default: `pnlCycle`): Field to sort by. Possible values:
        -   `balance`: Sort by `totalBalanceInUSD` (descending).
        -   `pnlCycle`: Sort by `aggregatedPnlCycle` (descending).
        -   `pnl24h`: Sort by `aggregatedPnl24h` (descending).
        -   `runningAgents`: Sort by `runningAgents` (descending).
-   **Success Response (200 OK):** `PaginatedResponseDto<CreatorLeaderboardEntryDto>` (See detailed DTO definition below)
-   **Error Responses:**
    -   `400 Bad Request`: If an invalid value is provided for `sortBy`.
    -   `401 Unauthorized`
-   **Notes:**
    -   The leaderboard data is pre-calculated periodically (e.g., hourly) for performance. The `updatedAt` field in each entry indicates the time of the last calculation.
    -   The default sort is by `pnlCycle` descending.

**Example Usage (Sort by Balance):**

```bash
curl -X GET "http://127.0.0.1:8080/api/creators/leaderboard?page=1&limit=10&sortBy=balance" \
     -H "x-api-key: YOUR_SECRET_API_KEY" | jq .
```

---

## 5. Detailed DTO Definitions

These are the specific DTOs used in the responses for the endpoints above.

**5.1. `CreatorDto`**

*(Used in: `GET /api/creators`, `GET /api/creators/{creatorId}`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreatorDto {
  @ApiProperty({ description: 'Creator ID (Wallet Address)', example: '0x123abc...' })
  creatorId: string;

  @ApiProperty({ description: 'Total number of agents managed by the creator', example: 10 })
  agentCount: number;
}
```

**5.2. `AgentSummaryDto`**

*(Used in: `GET /api/creators/{creatorId}/agents`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class AgentSummaryDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent-uuid-123' })
  id: string;

  @ApiProperty({ description: 'Agent Name', example: 'TradingBot Alpha' })
  name: string;

  @ApiProperty({ description: 'Agent Status', enum: AgentStatus, example: AgentStatus.RUNNING })
  status: AgentStatus;

  @ApiProperty({ description: 'Agent Creation Timestamp' })
  createdAt: Date;
}
```

**5.3. `CreatorPerformanceAgentDetailDto`**

*(Used within `CreatorPerformanceSummaryDto`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class CreatorPerformanceAgentDetailDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent-uuid-123' })
  id: string;

  @ApiProperty({ description: 'Agent Name', example: 'TradingBot Alpha' })
  name: string;

  @ApiProperty({ description: 'Agent Status', enum: AgentStatus, example: AgentStatus.RUNNING })
  status: AgentStatus;

  @ApiProperty({ description: 'Agent Profile Picture URL', required: false, example: '/uploads/profile-pictures/image.jpg' })
  profilePicture?: string;

  @ApiProperty({ description: 'Agent Current Balance in USD', required: false, type: Number, nullable: true, example: 1500.50 })
  balanceInUSD?: number | null;

  @ApiProperty({ description: 'Agent Current TVL', required: false, type: Number, nullable: true, example: 2500.00 })
  tvl?: number | null;

  @ApiProperty({ description: "Agent PnL (Cycle/Total) - Based on LatestMarketData's pnlCycle", required: false, type: Number, nullable: true, example: 450.20 })
  pnlCycle?: number | null;

  @ApiProperty({ description: "Agent PnL (24h) - Based on LatestMarketData's pnl24h", required: false, type: Number, nullable: true, example: 50.10 })
  pnl24h?: number | null;

  @ApiProperty({ description: "Agent Total Trades - Based on LatestMarketData's tradeCount", required: false, type: Number, nullable: true, example: 150 })
  tradeCount?: number | null;

  @ApiProperty({ description: "Agent Market Cap - Based on LatestMarketData's marketCap", required: false, type: Number, nullable: true, example: 275000.00 })
  marketCap?: number | null;

  @ApiProperty({ description: 'Agent Creation Timestamp', required: true })
  createdAt: Date;
}
```

**5.4. `CreatorPerformanceSummaryDto`**

*(Used in: `GET /api/creators/{creatorId}/performance`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { CreatorPerformanceAgentDetailDto } from './creator-performance-agent-detail.dto';

export class CreatorPerformanceSummaryDto {
  @ApiProperty({ description: 'Creator ID (Wallet Address)', example: '0x123abc...' })
  creatorId: string;

  @ApiProperty({ description: 'Total number of agents managed by the creator', example: 10 })
  totalAgents: number;

  @ApiProperty({ description: 'Number of currently RUNNING agents', example: 8 })
  runningAgents: number;

  @ApiProperty({ description: 'Aggregated Total Value Locked (TVL) across all agents with data', example: 50000.00, type: Number })
  totalTvl: number;

  @ApiProperty({ description: 'Aggregated Balance in USD across all agents with data', example: 35000.00, type: Number })
  totalBalanceInUSD: number;

  @ApiProperty({ description: 'Aggregated PnL (Cycle/Total) across all agents with data', example: 1250.75, type: Number })
  totalPnlCycle: number;

  @ApiProperty({ description: 'Aggregated PnL (24h) across all agents with data', example: 300.15, type: Number })
  totalPnl24h: number;

  @ApiProperty({ description: 'Total number of trades executed across all agents with data', example: 1200, type: Number })
  totalTradeCount: number;

  @ApiProperty({
    description: "Agent with the highest PnL (Cycle/Total). Null if no agents have performance data.",
    type: () => CreatorPerformanceAgentDetailDto,
    required: false,
    nullable: true,
  })
  bestPerformingAgentPnlCycle?: CreatorPerformanceAgentDetailDto | null;

  @ApiProperty({
    description: 'Detailed performance list for each agent associated with the creator.',
    type: [CreatorPerformanceAgentDetailDto],
  })
  agentDetails: CreatorPerformanceAgentDetailDto[];

  @ApiProperty({ description: 'Timestamp of the latest data included in the summary', required: false })
  lastUpdated?: Date;
}
```

**5.5. `CreatorLeaderboardEntryDto`**

*(Used in: `GET /api/creators/leaderboard`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreatorLeaderboardEntryDto {
  @ApiProperty({
    description: 'Creator wallet address',
    example: '0x046494be4b665b6182152e656d5eae6ec9dc8e8d8870851f11422fff1457736a',
  })
  creatorId: string;

  @ApiProperty({ description: 'Total number of agents created by this creator', example: 3 })
  totalAgents: number;

  @ApiProperty({ description: 'Number of agents in RUNNING status', example: 2 })
  runningAgents: number;

  @ApiProperty({ description: 'Total USD balance across all agents', example: 15000.5 })
  totalBalanceInUSD: number;

  @ApiProperty({ description: 'Aggregated PnL for the current cycle across all agents', example: 2500.75 })
  aggregatedPnlCycle: number;

  @ApiProperty({ description: 'Aggregated 24-hour PnL across all agents', example: 750.25 })
  aggregatedPnl24h: number;

  @ApiProperty({ description: 'ID of the best performing agent by PnL cycle', example: '123e4567-e89b-12d3-a456-426614174000', required: false })
  bestAgentId?: string;

  @ApiProperty({ description: 'PnL cycle of the best performing agent', example: 1250.5, required: false })
  bestAgentPnlCycle?: number;

  @ApiProperty({ description: 'Timestamp when the leaderboard data was last updated', example: '2023-04-30T14:30:00Z' })
  updatedAt: Date; // Note: Corresponds to CreatorLeaderboardData.updatedAt
}
```

**5.6. `LeaderboardQueryDto` (and `LeaderboardSortField` enum)**

*(Used in: `GET /api/creators/leaderboard`)*

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Enum defining valid sort fields for the leaderboard
export enum LeaderboardSortField {
  BALANCE = 'balance',
  PNL_CYCLE = 'pnlCycle',
  PNL_24H = 'pnl24h',
  RUNNING_AGENTS = 'runningAgents',
}

// Query DTO for the leaderboard endpoint
export class LeaderboardQueryDto {
  @ApiProperty({
    description: 'Page number (starts at 1)',
    example: 1,
    default: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    maximum: 100,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100) // Ensure Max matches PageQueryDto if inheriting, or define here
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    enum: LeaderboardSortField,
    default: LeaderboardSortField.PNL_CYCLE,
    required: false,
  })
  @IsEnum(LeaderboardSortField)
  @IsOptional()
  sortBy?: LeaderboardSortField = LeaderboardSortField.PNL_CYCLE;
}
```
