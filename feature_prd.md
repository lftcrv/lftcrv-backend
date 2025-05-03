# Feature: Creator Performance Summary Endpoint (#90)

**Related GitHub Issue:** [https://github.com/lftcrv/lftcrv-backend/issues/90](https://github.com/lftcrv/lftcrv-backend/issues/90)
**Parent Feature:** Creator Management & Performance Tracking (#88)

## 1. Goal

Implement a RESTful API endpoint using NestJS and Prisma to provide an aggregated performance summary for a specific creator, based on the performance of all agents associated with their `creatorWallet`. The summary should include both overall aggregated metrics and a list of individual agent performance details.

## 2. Endpoint Definition

-   **Method:** `GET`
-   **Path:** `/api/creators/{creatorId}/performance`
-   **Authentication:** Requires API Key (`@RequireApiKey()`)
-   **Path Parameter:**
    -   `creatorId`: string (Represents the `creatorWallet` from the database)
-   **Success Response (200 OK):** `CreatorPerformanceSummaryDto`
-   **Error Responses:**
    -   `401 Unauthorized`: Missing or invalid API Key.
    -   `404 Not Found`: Creator with the specified `creatorId` does not exist (has no associated agents).

## 3. DTO Definitions

Create the following DTOs within the `src/domains/creators/dtos/` directory.

**3.1. `CreatorPerformanceAgentDetailDto.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client'; // Ensure AgentStatus is imported

export class CreatorPerformanceAgentDetailDto {
  @ApiProperty({ description: 'Agent ID', example: 'agent-uuid-123' })
  id: string;

  @ApiProperty({ description: 'Agent Name', example: 'TradingBot Alpha' })
  name: string;

  @ApiProperty({ description: 'Agent Status', enum: AgentStatus, example: AgentStatus.RUNNING })
  status: AgentStatus;

  @ApiProperty({ description: 'Agent Profile Picture URL', required: false, example: '/path/to/image.jpg' })
  profilePicture?: string;

  @ApiProperty({ description: 'Agent Current Balance in USD', example: 1500.50, required: false, type: Number, default: 0 })
  balanceInUSD?: number | null; // Use number | null to explicitly show potential absence

  @ApiProperty({ description: 'Agent Current TVL', example: 2500.00, required: false, type: Number, default: 0 })
  tvl?: number | null;

  @ApiProperty({ description: "Agent PnL (Cycle/Total) - Based on LatestMarketData's pnlCycle", example: 450.20, required: false, type: Number, default: 0 })
  pnlCycle?: number | null;

  @ApiProperty({ description: "Agent PnL (24h) - Based on LatestMarketData's pnl24h", example: 50.10, required: false, type: Number, default: 0 })
  pnl24h?: number | null;

  @ApiProperty({ description: "Agent Total Trades - Based on LatestMarketData's tradeCount", example: 150, required: false, type: Number, default: 0 })
  tradeCount?: number | null;

  @ApiProperty({ description: "Agent Market Cap - Based on LatestMarketData's marketCap", example: 275000.00, required: false, type: Number, default: 0 })
  marketCap?: number | null;

  // Consider adding other relevant fields like createdAt if needed by frontend
  @ApiProperty({ description: 'Agent Creation Timestamp', required: false })
  createdAt?: Date;
}
```

**3.2. `CreatorPerformanceSummaryDto.dto.ts`**

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
    type: () => CreatorPerformanceAgentDetailDto, // Important for Swagger nested object documentation
    required: false,
    nullable: true,
  })
  bestPerformingAgentPnlCycle?: CreatorPerformanceAgentDetailDto | null;

  @ApiProperty({
    description: 'Detailed performance list for each agent associated with the creator.',
    type: [CreatorPerformanceAgentDetailDto], // Important for Swagger array documentation
  })
  agentDetails: CreatorPerformanceAgentDetailDto[];

  // Consider adding a timestamp indicating when the summary data was last calculated/updated
  @ApiProperty({ description: 'Timestamp of the latest data included in the summary', required: false })
  lastUpdated?: Date;
}
```

## 4. Service Logic (`CreatorsService`)

Add a new public method `getCreatorPerformance` to `src/domains/creators/services/creators.service.ts`.

**Method Signature:**

```typescript
async getCreatorPerformance(creatorId: string): Promise<CreatorPerformanceSummaryDto>
```

**Implementation Steps:**

1.  **Fetch Agents and Data:**
    -   Use `this.prisma.elizaAgent.findMany` to retrieve all agents where `creatorWallet` matches the input `creatorId`.
    -   Crucially, use `include: { LatestMarketData: true }` to eager-load the latest performance metrics for each agent in a single query.
    ```typescript
    const agentsWithData = await this.prisma.elizaAgent.findMany({
      where: { creatorWallet: creatorId },
      include: {
        LatestMarketData: true, // Eager load latest data
      },
      // Consider adding orderBy if needed for the agentDetails list, e.g., orderBy: { createdAt: 'desc' }
    });
    ```
2.  **Handle Not Found:**
    -   Check if `agentsWithData.length === 0`. If so, throw a `NotFoundException` indicating the creator (or their agents) were not found.
3.  **Initialize Aggregators:**
    -   Declare variables: `totalTvl = 0`, `totalBalanceInUSD = 0`, `totalPnlCycle = 0`, `totalPnl24h = 0`, `totalTradeCount = 0`, `runningAgents = 0`, `bestPnl = -Infinity`, `bestAgentDto = null`, `latestUpdateTimestamp = null`.
4.  **Process Agents:**
    -   Create an empty array `agentDetails: CreatorPerformanceAgentDetailDto[] = []`.
    -   Iterate through the `agentsWithData` array. For each `agent`:
        -   Create an instance of `CreatorPerformanceAgentDetailDto`.
        -   Map basic agent fields: `id`, `name`, `status`, `profilePicture`, `createdAt`.
        -   Check if `agent.LatestMarketData` exists and is not null.
            -   If **yes**:
                -   Map `LatestMarketData` fields (`balanceInUSD`, `tvl`, `pnlCycle`, `pnl24h`, `tradeCount`, `marketCap`) to the corresponding fields in the agent detail DTO.
                -   Add these values (null-checked, defaulting to 0 if null/undefined) to the respective total aggregators (`totalTvl += agent.LatestMarketData.tvl ?? 0`, etc.).
                -   Update `latestUpdateTimestamp` if the current agent's `LatestMarketData.updatedAt` is more recent.
                -   Compare `agent.LatestMarketData.pnlCycle` with `bestPnl`. If greater, update `bestPnl` and store the *currently mapped agent detail DTO* in `bestAgentDto`.
            -   If **no**:
                -   Populate the performance fields in the agent detail DTO with `null` or `0` as defined in the DTO defaults.
        -   Increment `runningAgents` counter if `agent.status === AgentStatus.RUNNING`.
        -   Push the fully mapped agent detail DTO into the `agentDetails` array.
5.  **Construct Response:**
    -   Create an instance of `CreatorPerformanceSummaryDto`.
    -   Populate it with:
        -   `creatorId` (from input).
        -   `totalAgents` (`agentsWithData.length`).
        -   `runningAgents` (calculated count).
        -   All aggregated totals (`totalTvl`, `totalBalanceInUSD`, etc.).
        -   `bestPerformingAgentPnlCycle` (the stored `bestAgentDto`).
        -   `agentDetails` (the populated array).
        -   `lastUpdated` (the `latestUpdateTimestamp` found).
6.  **Return:** The constructed `CreatorPerformanceSummaryDto`.

## 5. Controller Logic (`CreatorsController`)

Add a new GET endpoint method to `src/domains/creators/controllers/creators.controller.ts`.

**Method Signature:**

```typescript
async getCreatorPerformance(@Param('creatorId') creatorId: string): Promise<CreatorPerformanceSummaryDto>
```

**Implementation:**

1.  **Decorators:**
    -   `@Get(':creatorId/performance')`
    -   `@RequireApiKey()`
    -   `@ApiOperation({ summary: 'Get aggregated performance summary for a specific creator' })`
    -   `@ApiParam({ name: 'creatorId', description: 'The creator ID (wallet address)', type: String, example: '0x123...' })`
    -   `@ApiResponse({ status: 200, description: 'Creator performance summary retrieved successfully', type: CreatorPerformanceSummaryDto })`
    -   `@ApiNotFoundResponse({ description: 'Creator not found (no agents associated with this ID)' })`
    -   `@ApiUnauthorizedResponse({ description: 'API key is missing or invalid' })`
2.  **Logic:**
    -   Simply call `return this.creatorsService.getCreatorPerformance(creatorId);`

## 6. Implementation Considerations & Decisions

-   **Data Source:** Primarily use the `LatestMarketData` table as it contains pre-calculated/current metrics, avoiding heavy aggregation on historical `AgentPerformanceSnapshot` data.
-   **Data Staleness:** The returned data reflects the last time the `LatestMarketData` was updated (likely by the `updateAgentPerformanceSnapshots` cron job). This is acceptable for this feature iteration. The `lastUpdated` field in the response DTO helps indicate freshness.
-   **PnL Definition:** Use `LatestMarketData.pnlCycle` as the primary field representing total PnL for aggregation and identifying the best-performing agent.
-   **Handling Missing Data:** Agents without corresponding `LatestMarketData` records will have their performance metrics defaulted to `0` or `null` in the `agentDetails` list and will contribute `0` to the overall sums.
-   **Performance:** The current approach (fetching all agents + data, aggregating in service) is acceptable for initial implementation. If performance issues arise for creators with thousands of agents, optimize later using database-level aggregation (`prisma.latestMarketData.aggregate`).
-   **Best Performing Agent:** Definition is kept simple (highest `pnlCycle`). More complex definitions or sorting options are future considerations.
-   **Granular Data Pagination:** The `agentDetails` list within the response is *not* paginated in this iteration. This simplifies the initial implementation.

## 7. Testing Requirements

-   **Manual Testing:** Use `curl` (with a valid API key and creator ID) to test the `GET /api/creators/{creatorId}/performance` endpoint. Verify:
    -   Correct status codes (200, 401, 404).
    -   Response structure matches `CreatorPerformanceSummaryDto`.
    -   Aggregated values seem reasonable based on sample data.
    -   `agentDetails` list is populated correctly.
    -   `bestPerformingAgentPnlCycle` points to the correct agent (or is null).
-   **Automated Testing (Future):**
    -   Unit tests for `CreatorsService.getCreatorPerformance` mocking Prisma responses (including cases with/without `LatestMarketData`, no agents found).
    -   Integration tests for the controller endpoint.

## 8. Out of Scope

-   Advanced filtering/sorting options for the `agentDetails` list.
-   Real-time calculations (relies on cron job updates).
-   UI implementation for displaying this data.
-   Database-level aggregation performance optimizations (unless proven necessary).
