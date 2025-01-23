import { Controller, Get, Param, Query } from "@nestjs/common";

interface TechnicalAnalysis {};
interface TechnicalService {};

@Controller('analysis/technical')
export class TechnicalController {
    constructor(private technicalService: TechnicalService) {}

    @Get(':token')
    async getTechnicalAnalysis(
        @Param('token') token: string,
        @Query('timeframe') timeframe: string
    ): Promise<TechnicalAnalysis> {
        return this.technicalService.analyzeTechnicals(token, timeframe);
    }
}