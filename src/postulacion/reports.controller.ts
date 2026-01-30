
import { Controller, Get, Query, Res, Render } from '@nestjs/common';
import { ReportsService } from './reports.service';
import type { Response } from 'express';

@Controller()
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @Render('index') // Renders views/index.hbs for ESFM
    async getReportsPage() {
        const result = await this.reportsService.getFilters();
        return { layout: false, ...result };
    }

    @Get('Becas')
    @Render('becas') // Renders views/becas.hbs for Becas
    async getBecasReportsPage() {
        const result = await this.reportsService.getFilters(); // Dep/Recinto filters are same logic base
        return { layout: false, ...result };
    }
    
    @Get('Compulsas')
    @Render('compulsas') // Renders views/becas.hbs for Becas
    async getCompulsasReportsPage() {
        const result = await this.reportsService.getFilters(); // Dep/Recinto filters are same logic base
        return { layout: false, ...result };
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
    async getFechas(@Query('recinto_id') recintoId: number, @Query('tipo') tipo: string) {
        return await this.reportsService.getFechasByRecinto(recintoId, tipo);
    }

    @Get('reports/api/aulas')
    async getAulas(@Query('recinto_id') recintoId: number, @Query('tipo') tipo: string) {
        return await this.reportsService.getAulasByRecinto(recintoId, tipo);
    }

    @Get('reports/api/turnos')
    async getTurnos(@Query('recinto_id') recintoId: number, @Query('tipo') tipo: string) {
        return await this.reportsService.getTurnosByRecinto(recintoId, tipo);
    }

    @Get('reports/api/stats')
    async getStats(@Query('tipo') tipo: string) {
        return await this.reportsService.getStats(tipo);
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

    @Get('reports/pdf/beca')
    async downloadBecaPdf(@Query('ci') ci: string, @Res() res: Response) {
        // Enforce logic: Only generate if the user exists and is 'Becas'
        // generatePdf uses getReportData which now supports tipo_postulacion filter
        const buffer = await this.reportsService.generatePdf({ ci, tipo_postulacion: 'Becas' });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=reporte-beca-${ci}.pdf`,
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
