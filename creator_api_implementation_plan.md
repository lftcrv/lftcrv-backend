# Implementation Plan: Basic Creator API Endpoints (Issue #89)

This document outlines the steps to implement the basic API endpoints for retrieving creator information based on [GitHub Issue #89](https://github.com/lftcrv/lftcrv-backend/issues/89), part of the Creator Management feature ([#88](https://github.com/lftcrv/lftcrv-backend/issues/88)).

**Goal:** Implement RESTful endpoints using NestJS and Prisma to list creators (identified by their unique `creatorWallet` in the `ElizaAgent` model) and their associated agents. The API will use `creatorId` in paths and DTOs to represent this identifier abstractly.

**Implementation Steps:**

1.  **Prisma Schema Check:**
    *   Verify the `ElizaAgent` model in `prisma/schema.prisma` has the `creatorWallet: String` field.
    *   **Crucial:** Ensure an index exists on `creatorWallet`. If not, add `@@index([creatorWallet])` to the `ElizaAgent` model and run `npx prisma migrate dev --name add_creatorWallet_index`.

2.  **Module Setup:**
    *   Generate `CreatorsModule`, `CreatorsController`, `CreatorsService` using Nest CLI (`nest g module creators`, `nest g controller creators --no-spec`, `nest g service creators --no-spec`).
    *   Import necessary modules (e.g., `PrismaModule`) into `CreatorsModule`.

3.  **DTO Definitions (`creators/dto/`):**
    *   **`PageQueryDto.dto.ts`:** (Reuse if exists) Generic pagination query (`page`, `limit`) with validation.
    *   **`PaginatedResponseDto.dto.ts`:** (Reuse if exists) Generic paginated response wrapper (`data: T[]`, `total`, `page`, `limit`).
    *   **`CreatorDto.dto.ts`:** Response for a single creator.
        ```typescript
        import { ApiProperty } from '@nestjs/swagger';
        export class CreatorDto {
          @ApiProperty({ example: '0x123...' })
          creatorId: string; // Represents creatorWallet from DB
          @ApiProperty({ example: 5 })
          agentCount: number;
        }
        ```
    *   **`AgentSummaryDto.dto.ts`:** (Reuse/adapt existing `AgentDto` if possible) Response for an agent summary.
        ```typescript
        import { ApiProperty } from '@nestjs/swagger';
        import { AgentStatus } from '@prisma/client'; // Assuming enum exists
        export class AgentSummaryDto {
          @ApiProperty()
          id: string;
          @ApiProperty()
          name: string;
          @ApiProperty({ enum: AgentStatus })
          status: AgentStatus;
          @ApiProperty()
          createdAt: Date;
          // Add other relevant fields like profilePicture if needed by frontend
        }
        ```

4.  **Service (`CreatorsService`):**
    *   Inject `PrismaService`.
    *   **`findAllCreators(query: PageQueryDto): Promise<PaginatedResponseDto<CreatorDto>>`:**
        *   Use `prisma.elizaAgent.groupBy({ by: ['creatorWallet'], _count: { id: true }, skip, take })`.
        *   Fetch total unique creator count separately.
        *   Map results, assigning DB `creatorWallet` to DTO `creatorId`.
        *   Return paginated response.
    *   **`findCreatorById(creatorId: string): Promise<CreatorDto>`:**
        *   Use `prisma.elizaAgent.count({ where: { creatorWallet: creatorId } })`.
        *   Throw `NotFoundException` if count is 0.
        *   Return `{ creatorId: creatorId, agentCount: count }`.
    *   **`findAgentsByCreatorId(creatorId: string, query: PageQueryDto): Promise<PaginatedResponseDto<AgentSummaryDto>>`:**
        *   Use `prisma.elizaAgent.findMany({ where: { creatorWallet: creatorId }, select: { ... }, skip, take })`.
        *   Fetch total agent count for this creator.
        *   Map results to `AgentSummaryDto`.
        *   Return paginated response (empty data if no agents, no 404).

5.  **Controller (`CreatorsController`):**
    *   Set base route: `@Controller('creators')`, `@ApiTags('Creators')`.
    *   Use `ValidationPipe` for query DTOs.
    *   **`GET /`:**
        *   `@Query() query: PageQueryDto`
        *   Calls `service.findAllCreators(query)`
        *   Returns `PaginatedResponseDto<CreatorDto>`
        *   Add `@ApiOperation`, `@ApiOkResponse`, `@ApiQuery` decorators.
    *   **`GET /:creatorId`:**
        *   `@Param('creatorId') creatorId: string` (Add validation if needed)
        *   Calls `service.findCreatorById(creatorId)`
        *   Returns `CreatorDto`
        *   Add `@ApiOperation`, `@ApiOkResponse`, `@ApiNotFoundResponse` decorators.
    *   **`GET /:creatorId/agents`:**
        *   `@Param('creatorId') creatorId: string`
        *   `@Query() query: PageQueryDto`
        *   Calls `service.findAgentsByCreatorId(creatorId, query)`
        *   Returns `PaginatedResponseDto<AgentSummaryDto>`
        *   Add `@ApiOperation`, `@ApiOkResponse`, `@ApiQuery` decorators.

6.  **Testing:**
    *   Implement unit tests for `CreatorsService` (mock Prisma).
    *   Implement integration tests for `CreatorsController` (mock service or use test DB).

7.  **Documentation:**
    *   Ensure all endpoints, parameters, and responses are clearly documented using `@nestjs/swagger` decorators. Verify via the `/api` route.

**Out of Scope for this Task:**

*   Authentication/Authorization (Apply guards as needed based on project requirements).
*   Advanced performance tuning beyond indexing (Benchmark later if needed).
*   Filtering/sorting of agent lists.
*   Storing creator-specific metadata (May require future schema changes -> dedicated `Creator` table).

**Notes:**

*   The term `creatorId` is used in the API layer (routes, DTOs, parameters) to abstract the underlying database field `creatorWallet`. Remember to map between these in the service layer when interacting with Prisma.
*   Ensure pagination logic (`skip`, `take`, total counts) is implemented correctly in all relevant service methods. 