
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';
import { Departamento } from './entities/departamento.entity';
import { Recinto } from './entities/recinto.entity';
import { join } from 'path';
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
            // Query recinto table directly - it has dep_id column.
            // Note: Recintos are agnostic of tipo_postulacion mostly, but if we need to filter recintos that ONLY have becas vs esfm, 
            // we would need to join with postulacion.
            // For now, let's return all recintos for the dep, as a recinct can be used for both.
            // However, to be strict as requested, maybe we can filter those that have at least one postulacion of the type.
            // But let's keep it simple first as per standard behavior unless requested otherwise.
            // Actually, user wants "replícalo", so context matters. Let's assume recintos are shared for now.
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

    async getFechasByRecinto(recintoId: number, tipoPostulacion?: string) {
        const query = this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.fecha', 'fecha')
            .where('p.id_recinto = :recintoId', { recintoId });

        if (tipoPostulacion === 'Becas') {
            query.andWhere("p.tipo_postulacion = 'Becas'");
        } else {
            // For ESFM, assume null or 'ESFM' (standardize on null/empty usually for legacy)
            // But let's be safe: (tipo_postulacion IS NULL OR tipo_postulacion != 'Becas')
            query.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
        }

        const results = await query.getRawMany();

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

    async getAulasByRecinto(recintoId: number, tipoPostulacion?: string) {
        const query = this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.aula', 'aula')
            .where('p.id_recinto = :recintoId', { recintoId })
            .andWhere('p.aula IS NOT NULL');

        if (tipoPostulacion === 'Becas') {
            query.andWhere("p.tipo_postulacion = 'Becas'");
        } else {
            query.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
        }

        const results = await query.getRawMany();

        return results.map(r => r.aula).filter(a => a);
    }

    async getTurnosByRecinto(recintoId: number, tipoPostulacion?: string) {
        const query = this.postulacionRepository
            .createQueryBuilder('p')
            .select('DISTINCT p.turno', 'turno')
            .where('p.id_recinto = :recintoId', { recintoId })
            .andWhere('p.turno IS NOT NULL');

        if (tipoPostulacion === 'Becas') {
            query.andWhere("p.tipo_postulacion = 'Becas'");
        } else {
            query.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
        }

        const results = await query.getRawMany();

        return results.map(r => r.turno).filter(t => t);
    }

    async getStats(tipoPostulacion?: string) {
        // Helper to apply filter
        const applyFilter = (q: any) => {
            if (tipoPostulacion === 'Becas') {
                q.andWhere("p.tipo_postulacion = 'Becas'");
            } else {
                q.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
            }
            return q;
        };

        // Total global
        const totalQuery = this.postulacionRepository.createQueryBuilder('p');
        applyFilter(totalQuery);
        const total = await totalQuery.getCount();

        // Top Departamentos
        const byDeptQuery = this.postulacionRepository
            .createQueryBuilder('p')
            .select('d.dep_nombre', 'label')
            .addSelect('COUNT(*)', 'count')
            .innerJoin('p.departamento', 'd')
            .groupBy('d.dep_nombre')
            .orderBy('count', 'DESC');
        applyFilter(byDeptQuery);
        const byDept = await byDeptQuery.getRawMany();

        // Top ESFM
        const byEsfmQuery = this.postulacionRepository
            .createQueryBuilder('p')
            .select('p.esfm', 'label')
            .addSelect('COUNT(*)', 'count')
            .groupBy('p.esfm')
            .orderBy('count', 'DESC');
        applyFilter(byEsfmQuery);
        const byEsfm = await byEsfmQuery.getRawMany();

        // Top Recintos
        const byRecintoQuery = this.postulacionRepository
            .createQueryBuilder('p')
            .select('r.recinto_nombre', 'label')
            .addSelect('COUNT(*)', 'count')
            .innerJoin('p.recinto', 'r')
            .groupBy('r.recinto_nombre')
            .orderBy('count', 'DESC');
        applyFilter(byRecintoQuery);
        const byRecinto = await byRecintoQuery.getRawMany();

        return {
            total,
            byDept,
            byEsfm,
            byRecinto
        };
    }


    async getReportData(filters: any) {
        const query = this.postulacionRepository.createQueryBuilder('p')
            .leftJoinAndSelect('p.departamento', 'd')
            .leftJoinAndSelect('p.recinto', 'r')
            .leftJoinAndSelect('p.persona', 'pers')
            .orderBy('pers.paterno', 'ASC')
            .addOrderBy('pers.materno', 'ASC')
            .addOrderBy('pers.nombre', 'ASC');

        if (filters.departamento) query.andWhere('p.dep_id = :dep', { dep: filters.departamento });
        if (filters.recinto) query.andWhere('p.id_recinto = :rec', { rec: filters.recinto });
        if (filters.fecha) {
            // Use DATE() to compare only date part, ignoring time
            query.andWhere('DATE(p.fecha) = DATE(:fecha)', { fecha: filters.fecha });
        }
        if (filters.aula) query.andWhere('p.aula = :aula', { aula: filters.aula });
        if (filters.turno) query.andWhere('p.turno = :turno', { turno: filters.turno });
        if (filters.ci) query.andWhere('p.ci = :ci', { ci: filters.ci });
        if (filters.tipo_postulacion) query.andWhere('p.tipoPostulacion = :tipo', { tipo: filters.tipo_postulacion });

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

        // Get additional info from first record
        const municipioName = data.length > 0 ? data[0].municipio : '-';
        const aulaName = filters.aula || (data.length > 0 ? data[0].aula : '-');

        const pdfBuffer: Buffer = await new Promise(resolve => {
            const doc = new PDFDocument({
                size: 'LETTER',
                margin: 30
            });

            const pageWidth = 612;
            const pageHeight = 792;
            const margin = 30;
            const usableWidth = pageWidth - (margin * 2);

            // Function to add background logo
            const addBackground = () => {
                const logoPath = join(__dirname, '..', '..', 'public', 'logo.jpg');
                try {
                    doc.save();
                    doc.opacity(1.0); // Fully clear / no transparency
                    // Cover entire page (0,0 to pageWidth, pageHeight)
                    doc.image(logoPath, 0, 0, {
                        width: pageWidth,
                        height: pageHeight
                    });
                    doc.restore();
                } catch (e) {
                    console.error('Logo not found at:', logoPath);
                }
            };

            // Add background to first page
            addBackground();

            // Intercept addPage to add background automaticallly
            const oldAddPage = doc.addPage.bind(doc);
            doc.addPage = (options?: any) => {
                const result = oldAddPage(options);
                addBackground();
                return result;
            };

            // ==================== HEADER ====================
            doc.font('Helvetica-Bold').fontSize(14);
            doc.text('ACTA DE INGRESO AL EXAMEN DE ADMISIÓN 2026', margin, 100, {
                width: usableWidth,
                align: 'center'
            });

            // Line under title
            doc.moveTo(margin, 125).lineTo(pageWidth - margin, 125).lineWidth(1.5).stroke();

            // ==================== INFO BOX ====================
            let currentY = 135;
            const infoBoxHeight = 65;

            // Box
            doc.rect(margin, currentY, usableWidth, infoBoxHeight).lineWidth(1).stroke();

            // Row 1: Departamento and Municipio
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('DEPARTAMENTO:', margin + 10, currentY + 10);
            doc.font('Helvetica').fontSize(9);
            doc.text(deptName.toUpperCase(), margin + 95, currentY + 10);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('MUNICIPIO:', margin + 300, currentY + 10);
            doc.font('Helvetica').fontSize(9);
            doc.text(municipioName.toUpperCase(), margin + 360, currentY + 10);

            // Row 2: Recinto and Aula
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('RECINTO:', margin + 10, currentY + 28);
            doc.font('Helvetica').fontSize(9);
            doc.text(recintoName.toUpperCase(), margin + 95, currentY + 28, { width: 190 });

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('AULA:', margin + 300, currentY + 28);
            doc.font('Helvetica').fontSize(9);
            doc.text(aulaName.toString().toUpperCase(), margin + 360, currentY + 28);

            // Row 3: Turno and Fecha
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('TURNO:', margin + 10, currentY + 46);
            doc.font('Helvetica').fontSize(9);
            doc.text(filters.turno ? filters.turno.toUpperCase() : '-', margin + 95, currentY + 46);

            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('FECHA:', margin + 300, currentY + 46);
            doc.font('Helvetica').fontSize(9);
            doc.text(filters.fecha ? formatDate(filters.fecha) : '-', margin + 360, currentY + 46);

            currentY = 210;

            // ==================== TABLE ====================
            // Column configuration
            const cols = [
                { header: 'N°', width: 25, align: 'center' },
                { header: 'C.I.', width: 65, align: 'center' },
                { header: 'NOMBRE POSTULANTE', width: 170, align: 'left', small: true },
                { header: 'ESFM/UA', width: 110, align: 'left', small: true },
                { header: 'EQUIPO', width: 45, align: 'center' },
                { header: 'FIRMA', width: 137, align: 'center' }
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
                    currentY = 100; // Start new pages at the same margin

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

                // Concatenate full name: PATERNO MATERNO, NOMBRE
                const fullName = item.persona
                    ? `${item.persona.paterno || ''} ${item.persona.materno || ''}, ${item.persona.nombre || ''}`.trim().replace(/,\s*$/, '')
                    : '-';

                // Draw cell content
                xPos = margin;
                const rowData = [
                    (index + 1).toString(),
                    item.ci,
                    fullName.toUpperCase(),
                    item.esfm || '-',
                    item.equipo || '-',
                    ''
                ];

                doc.fillColor('#000');
                rowData.forEach((text, colIndex) => {
                    // Draw vertical lines
                    if (colIndex > 0) {
                        doc.moveTo(xPos, currentY).lineTo(xPos, currentY + rowHeight).stroke();
                    }

                    // Set font size: smaller for ESFM/UA (index 3)
                    const fontSize = (cols[colIndex] as any).small ? 7 : 9;
                    doc.fontSize(fontSize);

                    doc.text(text, xPos + 3, currentY + (fontSize === 7 ? 12 : 10), {
                        width: cols[colIndex].width - 6,
                        align: cols[colIndex].align as any
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
            const summaryHeight = 145;
            doc.rect(margin, currentY, usableWidth, summaryHeight).lineWidth(1.5).stroke();
            doc.rect(margin + 2, currentY + 2, usableWidth - 4, summaryHeight - 4).lineWidth(0.5).stroke();

            // Title with background
            doc.rect(margin, currentY, usableWidth, 28).fillAndStroke('#e8e8e8', '#000');
            doc.fillColor('#000');
            doc.font('Helvetica-Bold').fontSize(12);
            doc.text('RESUMEN Y FIRMAS DE RESPONSABILIDAD', margin + 10, currentY + 10);

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

            // Signatures
            currentY += 35;
            doc.font('Helvetica-Bold').fontSize(8);

            // Coordinator & Supervisor Row
            doc.text('NOMBRE Y FIRMA COORDINADOR:', margin + 20, currentY);
            doc.moveTo(margin + 20, currentY + 25).lineTo(margin + 230, currentY + 25).lineWidth(0.5).stroke();

            doc.text('NOMBRE Y FIRMA SUPERVISOR:', margin + 310, currentY);
            doc.moveTo(margin + 310, currentY + 25).lineTo(margin + 520, currentY + 25).lineWidth(0.5).stroke();

            // Responsible Row
            currentY += 35;
            doc.text('COORDINADOR DE AULA (Nombre, Firma y Celular):', margin + 20, currentY);
            doc.moveTo(margin + 20, currentY + 20).lineTo(pageWidth - margin - 20, currentY + 20).lineWidth(0.5).stroke();

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
