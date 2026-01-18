
import { Controller, Get, Query, Res, Render } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';

@Controller()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @Render('index') // Renders views/index.hbs
    async getReportsPage() {
        const result = await this.reportsService.getFilters();
        return { layout: false, ...result };
    }

    @Get('stats')
    @Render('stats')
    async getStatsPage() {
        return { layout: false };
    }

    @Get('reports/api/departamentos')
    async getDepartamentos() {
        const result = await this.reportsService.getFilters();
        return result.departamentos;
    }

    @Get('reports/api/recintos')
    async getRecintos(@Query('dep_id') depId: number) {
        return await this.reportsService.getRecintosByDepartamento(depId);
    }

    @Get('reports/api/fechas')
    async getFechas(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getFechasByRecinto(recintoId);
    }

    @Get('reports/api/aulas')
    async getAulas(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getAulasByRecinto(recintoId);
    }

    @Get('reports/api/turnos')
    async getTurnos(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getTurnosByRecinto(recintoId);
    }

    @Get('reports/api/stats')
    async getStats() {
        return await this.reportsService.getStats();
    }

    @Get('reports/api/data')
    async getReportData(@Query() query: any) {
        return await this.reportsService.getReportData(query);
    }

    @Get('reports/pdf')
    async downloadPdf(@Query() query: any, @Res() res: Response) {
        const buffer = await this.reportsService.generatePdf(query);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=reporte-postulantes.pdf',
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
