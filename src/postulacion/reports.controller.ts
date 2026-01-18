
import { Controller, Get, Query, Res, Render } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @Render('index') // Renders views/index.hbs
    async getReportsPage() {
        const result = await this.reportsService.getFilters();
        console.log('Filters Data:', JSON.stringify(result)); // Debug log
        return { layout: false, ...result };
    }

    @Get('api/departamentos')
    async getDepartamentos() {
        const result = await this.reportsService.getFilters();
        return result.departamentos;
    }

    @Get('api/recintos')
    async getRecintos(@Query('dep_id') depId: number) {
        return await this.reportsService.getRecintosByDepartamento(depId);
    }

    @Get('api/fechas')
    async getFechas(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getFechasByRecinto(recintoId);
    }

    @Get('api/aulas')
    async getAulas(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getAulasByRecinto(recintoId);
    }

    @Get('api/turnos')
    async getTurnos(@Query('recinto_id') recintoId: number) {
        return await this.reportsService.getTurnosByRecinto(recintoId);
    }

    @Get('api/data')
    async getReportData(@Query() query: any) {
        return await this.reportsService.getReportData(query);
    }

    @Get('pdf')
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
