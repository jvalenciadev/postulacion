
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Departamento } from './entities/departamento.entity';
import { Recinto } from './entities/recinto.entity';
const PDFDocument: any = require('pdfkit-table');

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Postulacion)
        private postulacionRepository: Repository<Postulacion>,
        @InjectRepository(Departamento)
        private departamentoRepository: Repository<Departamento>,
        @InjectRepository(Recinto)
        private recintoRepository: Repository<Recinto>,
    ) { }

    async getFilters() {
        try {
            const count = await this.departamentoRepository.count();
            console.log(`[ReportsService] Found ${count} departamentos in DB.`);

            const departamentos = await this.departamentoRepository.find();
            console.log('[ReportsService] Departamentos data:', JSON.stringify(departamentos));

            return { departamentos };
        } catch (error) {
            console.error('[ReportsService] Error fetching departments:', error.message);
            return { departamentos: [] };
        }
    }

    async getRecintosByDepartamento(depId: number) {
        try {
            console.log(`[ReportsService] Fetching recintos for dep_id=${depId}`);
            // Query recinto table directly - it has dep_id column
            const recintos = await this.recintoRepository.find({
                where: { dep_id: depId }
            });
            console.log(`[ReportsService] Found ${recintos.length} recintos`);
            return recintos;
        } catch (error) {
            console.error('[ReportsService] Error fetching recintos:', error.message);
            throw error;
        }
    }

    async getFechasByRecinto(recintoId: number) {
        const results = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.fecha', 'fecha')
            .where('p.id_recinto = :recintoId', { recintoId })
            .getRawMany();

        // Return objects with both display (formatted) and value (raw) for filtering
        return results.map(r => {
            if (!r.fecha) return null;
            try {
                const date = new Date(r.fecha);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return {
                    display: `${day}/${month}/${year}`,
                    value: r.fecha // Keep original for filtering
                };
            } catch {
                return { display: r.fecha, value: r.fecha };
            }
        }).filter(f => f);
    }

    async getAulasByRecinto(recintoId: number) {
        const results = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.aula', 'aula')
            .where('p.id_recinto = :recintoId', { recintoId })
            .andWhere('p.aula IS NOT NULL')
            .getRawMany();

        return results.map(r => r.aula).filter(a => a);
    }

    async getTurnosByRecinto(recintoId: number) {
        const results = await this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.turno', 'turno')
            .where('p.id_recinto = :recintoId', { recintoId })
            .andWhere('p.turno IS NOT NULL')
            .getRawMany();

        return results.map(r => r.turno).filter(t => t);
    }


    async getReportData(filters: any) {
        const query = this.postulacionRepository.createQueryBuilder('p')
            .leftJoinAndSelect('p.departamento', 'd')
            .leftJoinAndSelect('p.recinto', 'r')
            .orderBy('p.ci', 'ASC'); // Order by CI

        if (filters.departamento) query.andWhere('p.dep_id = :dep', { dep: filters.departamento });
        if (filters.recinto) query.andWhere('p.id_recinto = :rec', { rec: filters.recinto });
        if (filters.fecha) {
            // Use DATE() to compare only date part, ignoring time
            query.andWhere('DATE(p.fecha) = DATE(:fecha)', { fecha: filters.fecha });
        }
        if (filters.aula) query.andWhere('p.aula = :aula', { aula: filters.aula });
        if (filters.turno) query.andWhere('p.turno = :turno', { turno: filters.turno });

        return await query.getMany();
    }

    async generatePdf(filters: any): Promise<Buffer> {
        const data = await this.getReportData(filters);

        // Helper to format date as DD/MM/YYYY
        const formatDate = (dateStr: string): string => {
            if (!dateStr) return '-';
            try {
                const date = new Date(dateStr);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            } catch {
                return dateStr;
            }
        };

        // Get filter display names
        let deptName = 'TODOS';
        let recintoName = 'TODOS';
        if (filters.departamento) {
            const dept = await this.departamentoRepository.findOne({ where: { dep_id: filters.departamento } });
            deptName = dept?.dep_nombre || filters.departamento;
        }
        if (filters.recinto) {
            const rec = await this.recintoRepository.findOne({ where: { id_recinto: filters.recinto } });
            recintoName = rec?.recinto_nombre || filters.recinto;
        }

        const pdfBuffer: Buffer = await new Promise(resolve => {
            const doc = new PDFDocument({
                size: 'LETTER',
                margin: 30
            });

            const pageWidth = 612;
            const pageHeight = 792;
            const margin = 30;
            const usableWidth = pageWidth - (margin * 2);

            // ==================== HEADER ====================
            doc.font('Helvetica-Bold').fontSize(14);
            doc.text('LISTA DE INGRESOS Y OBSERVACIONES', margin, 40, {
                width: usableWidth,
                align: 'center'
            });

            // Line under title
            doc.moveTo(margin, 65).lineTo(pageWidth - margin, 65).lineWidth(1.5).stroke();

            // ==================== INFO BOX ====================
            let currentY = 75;

            // Box
            doc.rect(margin, currentY, usableWidth, 60).lineWidth(1).stroke();

            // Content
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('RECINTO:', margin + 10, currentY + 10);
            doc.font('Helvetica').fontSize(9);
            doc.text(recintoName, margin + 70, currentY + 10, { width: 200 });

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('AULA:', margin + 300, currentY + 10);
            doc.font('Helvetica').fontSize(9);
            doc.text(filters.aula || 'TODAS', margin + 340, currentY + 10);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('FECHA:', margin + 10, currentY + 35);
            doc.font('Helvetica').fontSize(9);
            doc.text(filters.fecha ? formatDate(filters.fecha) : 'TODAS', margin + 70, currentY + 35);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('TURNO:', margin + 300, currentY + 35);
            doc.font('Helvetica').fontSize(9);
            doc.text(filters.turno || 'TODOS', margin + 340, currentY + 35);

            currentY = 150;

            // ==================== TABLE ====================
            // Column configuration
            const cols = [
                { header: 'N°', width: 30, align: 'center' },
                { header: 'NOMBRE COMPLETO', width: 180, align: 'left' },
                { header: 'C.I.', width: 80, align: 'center' },
                { header: 'FIRMA\nENTRADA', width: 90, align: 'center' },
                { header: 'FIRMA\nSALIDA', width: 90, align: 'center' },
                { header: 'OBSERVACIONES', width: 82, align: 'left' }
            ];

            const rowHeight = 30; // Increased for more signature space
            const headerHeight = 32;

            // Draw table header
            let xPos = margin;
            doc.font('Helvetica-Bold').fontSize(9);

            // Header background with gradient effect
            doc.rect(margin, currentY, usableWidth, headerHeight).fillAndStroke('#d0d0d0', '#000');

            // Header text
            doc.fillColor('#000');
            cols.forEach(col => {
                const textY = currentY + (col.header.includes('\n') ? 9 : 13);
                doc.text(col.header, xPos, textY, {
                    width: col.width,
                    align: col.align
                });
                xPos += col.width;
            });

            currentY += headerHeight;

            // Draw table rows
            doc.font('Helvetica').fontSize(9);

            data.forEach((item, index) => {
                // Check if we need a new page
                if (currentY + rowHeight > pageHeight - 150) {
                    doc.addPage();
                    currentY = 50;

                    // Redraw header on new page
                    xPos = margin;
                    doc.font('Helvetica-Bold').fontSize(9);
                    doc.rect(margin, currentY, usableWidth, headerHeight).fillAndStroke('#d0d0d0', '#000');
                    doc.fillColor('#000');
                    cols.forEach(col => {
                        const textY = currentY + (col.header.includes('\n') ? 9 : 13);
                        doc.text(col.header, xPos, textY, {
                            width: col.width,
                            align: col.align
                        });
                        xPos += col.width;
                    });
                    currentY += headerHeight;
                    doc.font('Helvetica').fontSize(9);
                }

                // Alternate row colors
                if (index % 2 === 0) {
                    doc.rect(margin, currentY, usableWidth, rowHeight).fill('#fafafa');
                }

                // Draw row border
                doc.rect(margin, currentY, usableWidth, rowHeight).stroke();

                // Draw cell content
                xPos = margin;
                const rowData = [
                    (index + 1).toString(),
                    '', // NOMBRE COMPLETO - blank for manual entry
                    item.ci,
                    '', // FIRMA ENTRADA
                    '', // FIRMA SALIDA
                    ''  // OBSERVACIONES
                ];

                doc.fillColor('#000');
                rowData.forEach((text, colIndex) => {
                    // Draw vertical lines
                    if (colIndex > 0) {
                        doc.moveTo(xPos, currentY).lineTo(xPos, currentY + rowHeight).stroke();
                    }

                    doc.text(text, xPos + 3, currentY + 10, {
                        width: cols[colIndex].width - 6,
                        align: cols[colIndex].align
                    });
                    xPos += cols[colIndex].width;
                });

                currentY += rowHeight;
            });

            // ==================== SUMMARY BOX ====================
            currentY += 20;

            // Check if summary fits on current page
            if (currentY + 110 > pageHeight - margin) {
                doc.addPage();
                currentY = 50;
            }

            // Box with double border for emphasis
            doc.rect(margin, currentY, usableWidth, 110).lineWidth(1.5).stroke();
            doc.rect(margin + 2, currentY + 2, usableWidth - 4, 106).lineWidth(0.5).stroke();

            // Title with background
            doc.rect(margin, currentY, usableWidth, 28).fillAndStroke('#e8e8e8', '#000');
            doc.fillColor('#000');
            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('RESUMEN', margin + 10, currentY + 10);

            // Counts
            currentY += 35;
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('CANTIDAD DE POSTULANTES:', margin + 10, currentY);
            doc.font('Helvetica').fontSize(10);
            doc.text(data.length.toString(), margin + 180, currentY);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('CANTIDAD QUE ASISTIERON:', margin + 300, currentY);
            doc.font('Helvetica').fontSize(10);
            doc.text('________', margin + 470, currentY);

            currentY += 20;
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('CANTIDAD AUSENTES:', margin + 10, currentY);
            doc.font('Helvetica').fontSize(10);
            doc.text('________', margin + 180, currentY);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('CANTIDAD DE ANULADOS:', margin + 300, currentY);
            doc.font('Helvetica').fontSize(10);
            doc.text('________', margin + 470, currentY);

            // Signatures with more space
            currentY += 28;
            doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).lineWidth(1).stroke();

            currentY += 8;
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('NOMBRE Y FIRMA COORDINADOR:', margin + 30, currentY);
            doc.moveTo(margin + 50, currentY + 20).lineTo(margin + 230, currentY + 20).lineWidth(1).stroke();

            doc.text('NOMBRE Y FIRMA SUPERVISOR:', margin + 320, currentY);
            doc.moveTo(margin + 340, currentY + 20).lineTo(margin + 520, currentY + 20).lineWidth(1).stroke();

            doc.end();

            const buffer = [];
            doc.on('data', buffer.push.bind(buffer));
            doc.on('end', () => {
                const data = Buffer.concat(buffer);
                resolve(data);
            });
        });

        return pdfBuffer;
    }
}
