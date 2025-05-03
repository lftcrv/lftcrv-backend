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

---

# Feature: Creator Leaderboard Endpoint (#91)

**Related GitHub Issue:** [https://github.com/lftcrv/lftcrv-backend/issues/91](https://github.com/lftcrv/lftcrv-backend/issues/91)
**Parent Feature:** Creator Management & Performance Tracking (#88)

## 1. Goal

Implement a RESTful API endpoint (`GET /api/creators/leaderboard`) that returns a paginated and ranked list of creators based on their aggregated agent performance. This provides a way to identify top-performing creators within the platform.

## 2. Approach Decision: Pre-calculation for Performance

Calculating leaderboard rankings across potentially thousands of creators and agents on-the-fly for every API request is highly inefficient and unlikely to scale. Therefore, the chosen approach is **periodic pre-calculation**:

*   A **new database table** (`creator_leaderboard_data`) will store the aggregated KPIs and calculated rank for each creator.
*   A **cron job** will run periodically (e.g., hourly) to:
    *   Aggregate performance data for all creators from `LatestMarketData`.
    *   Calculate the rank based on the primary KPI.
    *   Update the `creator_leaderboard_data` table.
*   The API endpoint will **query this pre-calculated table directly**, making reads fast and efficient.

## 3. Defining Ranking KPIs

*   **Primary Ranking KPI:** `aggregatedPnlCycle` (Sum of `pnlCycle` from `LatestMarketData` for all agents belonging to a creator). This aligns with the individual summary (#90) and provides a clear measure of overall profit generation.
*   **Supporting KPIs (for context in the response):**
    *   `aggregatedBalanceInUSD`
    *   `aggregatedTvl`
    *   `totalAgentCount`
    *   `runningAgentCount`
    *   `calculatedAt` (Timestamp of the cron job run)

## 4. New Database Model (`prisma/schema.prisma`)

```prisma
model CreatorLeaderboardData {
  id                     String    @id @default(uuid())
  creatorId              String    @unique @map("creator_id") // Corresponds to ElizaAgent.creatorWallet
  rank                   Int       // Calculated rank based on primary KPI
  aggregatedPnlCycle     Float     @default(0) @map("aggregated_pnl_cycle")
  aggregatedBalanceInUSD Float     @default(0) @map("aggregated_balance_in_usd")
  aggregatedTvl          Float     @default(0) @map("aggregated_tvl")
  totalAgentCount        Int       @default(0) @map("total_agent_count")
  runningAgentCount      Int       @default(0) @map("running_agent_count")
  calculatedAt           DateTime  @map("calculated_at") // Timestamp of the last calculation run

  @@index([rank])
  @@index([aggregatedPnlCycle])
  @@index([calculatedAt])
  @@map("creator_leaderboard_data")
}
```
*(**Action:** This model needs to be added to `prisma/schema.prisma` and migrations generated/run).*

## 5. DTO Definitions (`src/domains/creators/dtos/`)

*(**Action:** Create these files and update `src/domains/creators/dtos/index.ts`)*

**5.1. `CreatorLeaderboardEntryDto.dto.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreatorLeaderboardEntryDto {
  @ApiProperty({ description: 'Calculated rank of the creator based on the primary KPI', example: 1 })
  rank: number;

  @ApiProperty({ description: 'Creator ID (Wallet Address)', example: '0x123abc...' })
  creatorId: string;

  @ApiProperty({ description: 'Aggregated PnL (Cycle/Total) across all agents', example: 1250.75, type: Number })
  aggregatedPnlCycle: number;

  @ApiProperty({ description: 'Aggregated Balance in USD across all agents', example: 35000.00, type: Number })
  aggregatedBalanceInUSD: number;

  @ApiProperty({ description: 'Aggregated Total Value Locked (TVL) across all agents', example: 50000.00, type: Number })
  aggregatedTvl: number;

  @ApiProperty({ description: 'Total number of agents managed by the creator', example: 10 })
  totalAgentCount: number;

  @ApiProperty({ description: 'Number of currently RUNNING agents', example: 8 })
  runningAgentCount: number;

  @ApiProperty({ description: 'Timestamp when this leaderboard data was calculated' })
  calculatedAt: Date;

  // Future consideration: Add creator profile info (name, picture) if/when available
}
```

**5.2. `LeaderboardQueryDto.dto.ts`**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsIn } from 'class-validator';
import { PageQueryDto } from './page-query.dto'; // Reuse base pagination

// Define enums in the DTO file or import if defined centrally
export enum LeaderboardSortBy {
  RANK = 'rank',
  PNL_CYCLE = 'aggregatedPnlCycle',
  TVL = 'aggregatedTvl',
  BALANCE = 'aggregatedBalanceInUSD',
  AGENT_COUNT = 'totalAgentCount',
}

export enum SortOrder {
 ASC = 'asc',
 DESC = 'desc',
}


export class LeaderboardQueryDto extends PageQueryDto {
  @ApiPropertyOptional({
    description: 'Field to sort the leaderboard by',
    enum: LeaderboardSortBy,
    default: LeaderboardSortBy.RANK,
  })
  @IsOptional()
  @IsEnum(LeaderboardSortBy)
  sortBy?: LeaderboardSortBy = LeaderboardSortBy.RANK;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC, // Default to ASC for Rank (1, 2, 3...)
  })
  @IsOptional()
  @IsIn([SortOrder.ASC, SortOrder.DESC])
  sortOrder?: SortOrder = SortOrder.ASC;
}
```

## 6. Service Logic

*(**Action:** Implement the following logic)*

*   **Modify `CronTasksService` (`src/cron/tasks.service.ts`):**
    *   Inject `CreatorsService` (or preferably create a new `LeaderboardService`).
    *   Add a new `@Cron()` schedule (e.g., `'0 * * * *'` for hourly).
    *   Create a method `updateCreatorLeaderboard()` decorated with `@Cron(...)`.
    *   This method should call the main leaderboard calculation logic (e.g., `this.leaderboardService.calculateAndStoreLeaderboard()`).

*   **Create `LeaderboardService` (`src/domains/leaderboard/services/leaderboard.service.ts`) (Recommended):**
    *   *(Alternatively, add to `CreatorsService`)*
    *   **`calculateAndStoreLeaderboard()` (Called by Cron):**
        1.  **Aggregate Data:** Use Prisma `groupBy` on `ElizaAgent` to get `creatorWallet` and agent counts (`totalAgentCount`, `runningAgentCount`). Separately, use `groupBy` on `LatestMarketData` (linked via `ElizaAgent`) to aggregate performance KPIs (`pnlCycle`, `balanceInUSD`, `tvl`) per `creatorWallet`. Join these results in memory.
            *   *Consideration:* This might require careful query construction or multiple steps to efficiently get all needed data grouped by creator. Raw SQL might be more efficient if Prisma's ORM proves limiting for this complex aggregation.
        2.  **Rank Calculation:** Sort the combined aggregated results (descending by `aggregatedPnlCycle`). Assign ranks (1, 2, 3...). Handle ties based on database default ordering for now.
        3.  **Data Upsert:** Loop through the ranked creator data. Use `prisma.creatorLeaderboardData.upsert()` for each creator within a `$transaction` to atomically insert/update their entry in the `creator_leaderboard_data` table with the calculated KPIs, rank, and the current timestamp (`calculatedAt`).
    *   **`getLeaderboard(query: LeaderboardQueryDto)` (Called by API):**
        1.  **Parse Query:** Extract `page`, `limit`, `sortBy`, `sortOrder`.
        2.  **Database Query:** Execute `prisma.creatorLeaderboardData.findMany()` with `skip`, `take`, and `orderBy: { [sortBy]: sortOrder }`.
        3.  **Get Total Count:** Execute `prisma.creatorLeaderboardData.count()` for pagination metadata.
        4.  **Map to DTO:** Map the database results to `CreatorLeaderboardEntryDto`.
        5.  **Return `PaginatedResponseDto`:** Construct and return the standard paginated response.

*   **Create `ILeaderboardService` Interface (`src/domains/leaderboard/interfaces/leaderboard-service.interface.ts`):** Define method signatures (`calculateAndStoreLeaderboard`, `getLeaderboard`).
*   **Update `CreatorsService` Interface (if logic added there):** Add `getLeaderboard` method signature.

## 7. Controller Logic (`CreatorsController`)

*(**Action:** Implement the following endpoint)*

*   Add a new GET endpoint method:
    ```typescript
    @Get('leaderboard')
    @RequireApiKey() // Or potentially make public depending on requirements
    @ApiOperation({ summary: 'Get the ranked list of creators based on performance' })
    @ApiQuery({ type: LeaderboardQueryDto })
    @ApiResponse({
      status: 200,
      description: 'Paginated list of creators ranked by performance',
      type: PaginatedResponseDto<CreatorLeaderboardEntryDto>, // Specify generic type for Swagger
    })
    @ApiUnauthorizedResponse({ description: 'API key is missing or invalid' }) // If @RequireApiKey is used
    async getLeaderboard(
      @Query(ValidationPipe) query: LeaderboardQueryDto,
    ): Promise<PaginatedResponseDto<CreatorLeaderboardEntryDto>> {
      // Inject and call LeaderboardService or CreatorsService
      return this.leaderboardService.getLeaderboard(query);
    }
    ```
*   Need to adjust imports and potentially the `PaginatedResponseDto` swagger type definition if it wasn't set up generically.

## 8. Challenging Questions & Considerations

*   **Choice of Primary KPI (`aggregatedPnlCycle`):**
    *   *Challenge:* Does summing PnL favor creators who run many mediocre agents over those with a few highly profitable ones? Could average PnL per agent or a risk-adjusted metric be fairer?
    *   *Decision:* Start with `aggregatedPnlCycle` for simplicity and alignment with issue #90. Acknowledge this limitation. Future iterations could introduce alternative ranking methods or allow sorting by different calculated metrics.
*   **Performance of Pre-calculation:**
    *   *Challenge:* How long will the aggregation query take as the number of agents/creators grows? Could it impact database performance?
    *   *Mitigation:* Ensure efficient database query (use `EXPLAIN ANALYZE`), proper indexing on relevant columns (`creatorWallet`, `status` in `ElizaAgent`; FK in `LatestMarketData`). Monitor cron job execution time. If it becomes too slow (> minutes), investigate more advanced techniques (materialized views, dedicated data warehousing/ETL).
*   **Data Freshness vs. Cost:**
    *   *Challenge:* Is hourly fresh enough for a leaderboard? What's the business need?
    *   *Decision:* Hourly is a reasonable starting point balancing freshness and DB load. Adjustable based on feedback.
*   **Tie-breaking:**
    *   *Challenge:* How are creators with the exact same `aggregatedPnlCycle` ranked?
    *   *Decision:* Relies on database default sort order for ties when sorting by the primary KPI (`rank`, which is based on `aggregatedPnlCycle`). If specific tie-breaking is needed (e.g., secondary sort by TVL), the ranking logic in the cron job and potentially the `getLeaderboard` query `orderBy` needs modification.
*   **New Creators/Agents:**
    *   *Challenge:* A new creator/agent won't appear on the leaderboard until the next cron job run calculates their stats.
    *   *Decision:* Acceptable trade-off for performance.
*   **"Originality" KPI:**
    *   *Challenge:* How would it be measured? (Similarity of agent configurations? Unique trading pairs? Deviation from common strategies?)
    *   *Decision:* Out of scope. Requires significant definition and likely complex analysis, unsuitable for simple aggregation.

## 9. Consistency Check

*   Uses existing decorators (`@RequireApiKey`, `@ApiOperation`, etc.).
*   Reuses `PaginatedResponseDto`.
*   Leverages `LatestMarketData` as the performance source, consistent with #90.
*   Proposes a new, focused table (`creator_leaderboard_data`) and potentially a new service (`LeaderboardService`) for separation of concerns.
*   Uses standard NestJS cron scheduling (`@Cron`).

## 10. Testing Requirements

*   **Cron Job:**
    *   Verify the cron job runs at the expected interval.
    *   Verify `creator_leaderboard_data` table is populated/updated correctly after the job runs.
    *   Test calculation accuracy with sample agent/market data.
    *   Test edge cases (no agents, agents with no market data, new creators appearing after a run).
*   **API Endpoint (`GET /api/creators/leaderboard`):**
    *   Manually test with `curl` (or similar) after cron job has run.
    *   Verify pagination (`page`, `limit`).
    *   Verify sorting (`sortBy`, `sortOrder`) against the data in `creator_leaderboard_data`.
    *   Verify response structure matches `PaginatedResponseDto<CreatorLeaderboardEntryDto>`.
    *   Verify 401 if API key is required and missing.
*   **Automated Testing (Future):**
    *   Unit tests for the aggregation and ranking logic within the service (mocking Prisma).
    *   Integration tests for the cron job execution and database updates.
    *   Integration tests for the controller endpoint (mocking service or using a test database).
