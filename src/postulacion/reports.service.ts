
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
            query.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
        }

        const results = await query.getRawMany();

        return results.map(r => {
            if (!r.fecha) return null;
            try {
                const date = new Date(r.fecha);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return {
                    display: `${day}/${month}/${year}`,
                    value: r.fecha
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
        const applyFilter = (q: any) => {
            if (tipoPostulacion === 'Becas') {
                q.andWhere("p.tipo_postulacion = 'Becas'");
            } else {
                q.andWhere("(p.tipo_postulacion IS NULL OR p.tipo_postulacion != 'Becas')");
            }
            return q;
        };

        const totalQuery = this.postulacionRepository.createQueryBuilder('p');
        applyFilter(totalQuery);
        const total = await totalQuery.getCount();

        const byDeptQuery = this.postulacionRepository
            .createQueryBuilder('p')
            .select('d.dep_nombre', 'label')
            .addSelect('COUNT(*)', 'count')
            .innerJoin('p.departamento', 'd')
            .groupBy('d.dep_nombre')
            .orderBy('count', 'DESC');
        applyFilter(byDeptQuery);
        const byDept = await byDeptQuery.getRawMany();

        const byEsfmQuery = this.postulacionRepository
            .createQueryBuilder('p')
            .select('p.esfm', 'label')
            .addSelect('COUNT(*)', 'count')
            .groupBy('p.esfm')
            .orderBy('count', 'DESC');
        applyFilter(byEsfmQuery);
        const byEsfm = await byEsfmQuery.getRawMany();

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
            .leftJoinAndSelect('p.persona', 'pers');

        // Always sort by nombre_completo if available, or concatenated name parts
        if (filters.tipo_postulacion === 'compulsa') {
            query.orderBy('pers.nombre_completo', 'ASC');
        } else {
            query.orderBy('pers.paterno', 'ASC')
                .addOrderBy('pers.materno', 'ASC')
                .addOrderBy('pers.nombre', 'ASC');
        }

        if (filters.departamento) query.andWhere('p.dep_id = :dep', { dep: filters.departamento });
        if (filters.recinto) query.andWhere('p.id_recinto = :rec', { rec: filters.recinto });
        if (filters.fecha) {
            query.andWhere('DATE(p.fecha) = DATE(:fecha)', { fecha: filters.fecha });
        }
        if (filters.aula) query.andWhere('p.aula = :aula', { aula: filters.aula });
        if (filters.turno) query.andWhere('p.turno = :turno', { turno: filters.turno });
        if (filters.ci) query.andWhere('p.ci = :ci', { ci: filters.ci });
        if (filters.tipo_postulacion) query.andWhere('p.tipoPostulacion = :tipo', { tipo: filters.tipo_postulacion });

        // Deduplication for Compulsas
        if (filters.tipo_postulacion === 'compulsa') {
            const start = new Date('2026-01-28T00:00:00');
            const end = new Date('2026-01-28T23:59:59');
            query.andWhere('pers.fecha_actualizado BETWEEN :start AND :end', { start, end });
        }

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
        const esfmName = data.length > 0 ? (data[0].esfm || '-') : '-';
        const aulaName = filters.aula || (data.length > 0 ? data[1].aula : '-');

        const pdfBuffer: Buffer = await new Promise(resolve => {
            const doc = new PDFDocument({
                size: 'LETTER',
                margin: 40
            });

            const pageWidth = 612;
            const pageHeight = 792;
            const margin = 40;
            const usableWidth = pageWidth - (margin * 2);

            // Function to add background logo
            const addBackground = () => {
                const logoPath = join(__dirname, '..', '..', 'public', 'logo.jpg');
                try {
                    doc.save();
                    doc.opacity(1.0);
                    doc.image(logoPath, 0, 0, {
                        width: pageWidth,
                        height: pageHeight
                    });
                    doc.restore();
                } catch (e) {
                    console.error('Logo not found at:', logoPath);
                }
            };

            addBackground();

            const oldAddPage = doc.addPage.bind(doc);
            doc.addPage = (options?: any) => {
                const result = oldAddPage(options);
                addBackground();
                return result;
            };

            // ==================== HEADER ====================
            let currentY = 100; // Padding to avoid logo overlap
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');

            let pdfTitle = 'ADMISIÓN DE POSTULANTES A LAS ESCUELAS SUPERIORES DE FORMACIÓN DE MAESTROS Y UNIDADES ACADÉMICAS DEL ESTADO PLURINACIONAL DE BOLIVIA - GESTIÓN 2026';
            if (filters.tipo_postulacion === 'Becas') {
                pdfTitle = 'ADMISIÓN DE POSTULANTES A LAS ESCUELAS SUPERIORES DE FORMACIÓN DE MAESTROS Y UNIDADES ACADÉMICAS DEL ESTADO PLURINACIONAL DE BOLIVIA - GESTIÓN 2026';
            } else if (filters.tipo_postulacion === 'compulsa') {
                pdfTitle = 'CONVOCATORIA PÚBLICA ESFM/UA N°001/2026 COMPULSA DE MÉRITOS PROFESIONALES PARA OPTAR A CARGOS DIRECTIVOS, DOCENTES Y ADMINISTRATIVOS ACÉFALOS DE LAS ESFM/UA GESTIÓN 2026 LISTA DE CONTROL';
            }

            doc.text(pdfTitle.toUpperCase(), margin, currentY, {
                width: usableWidth,
                align: 'center',
                lineGap: 3
            });

            currentY += 65;

            // ==================== INFO BOX ====================
            const headerBgColor = '#706000'; // Olive/Gold
            const labelWidth = 130;

            doc.font('Helvetica-Bold').fontSize(10);

            // Row 1: Departamento
            doc.rect(margin, currentY, labelWidth, 18).fill(headerBgColor);
            doc.fillColor('#FFF').text('DEPARTAMENTO', margin + 5, currentY + 5, { width: labelWidth - 10, align: 'center' });
            doc.rect(margin + labelWidth, currentY, usableWidth - labelWidth, 18).stroke();
            doc.fillColor('#000').font('Helvetica').text(deptName.toUpperCase(), margin + labelWidth + 10, currentY + 5);

            currentY += 18;

            // Row 2: Aula + Recinto
            doc.rect(margin, currentY, labelWidth, 18).fill(headerBgColor);
            doc.fillColor('#FFF').font('Helvetica-Bold').text('AULA', margin + 5, currentY + 5, { width: labelWidth - 10, align: 'center' });
            doc.rect(margin + labelWidth, currentY, 100, 18).stroke();
            doc.fillColor('#000').font('Helvetica').text(aulaName.toString().toUpperCase(), margin + labelWidth + 10, currentY + 5);

            doc.rect(margin + labelWidth + 100, currentY, 80, 18).fill(headerBgColor);
            doc.fillColor('#FFF').font('Helvetica-Bold').text('RECINTO', margin + labelWidth + 100, currentY + 5, { width: 80, align: 'center' });
            doc.rect(margin + labelWidth + 100 + 80, currentY, usableWidth - (labelWidth + 100 + 80), 18).stroke();
            doc.fillColor('#000').font('Helvetica').fontSize(7).text(recintoName.toUpperCase(), margin + labelWidth + 100 + 85, currentY + 6, { width: usableWidth - (labelWidth + 100 + 80) - 10 });

            currentY += 18;
            doc.fontSize(10);

            // Row 3: Turno + Fecha
            doc.rect(margin, currentY, labelWidth, 18).fill(headerBgColor);
            doc.fillColor('#FFF').font('Helvetica-Bold').text('TURNO', margin + 5, currentY + 5, { width: labelWidth - 10, align: 'center' });
            doc.rect(margin + labelWidth, currentY, 100, 18).stroke();
            doc.fillColor('#000').font('Helvetica').text(filters.turno ? filters.turno.toUpperCase() : '-', margin + labelWidth + 10, currentY + 5);

            doc.rect(margin + labelWidth + 100, currentY, 80, 18).fill(headerBgColor);
            doc.fillColor('#FFF').font('Helvetica-Bold').text('FECHA', margin + labelWidth + 100, currentY + 5, { width: 80, align: 'center' });
            doc.rect(margin + labelWidth + 100 + 80, currentY, usableWidth - (labelWidth + 100 + 80), 18).stroke();
            doc.fillColor('#000').font('Helvetica').text(filters.fecha ? formatDate(filters.fecha) : '-', margin + labelWidth + 100 + 85, currentY + 5);

            currentY += 45;

            // ==================== TABLE ====================
            const cols = [
                { header: 'N°', width: 25, align: 'center' },
                { header: 'NOMBRE POSTULANTE', width: 180, align: 'center' },
                { header: 'CI', width: 85, align: 'center' },
                { header: 'FIRMA\nINGRESO', width: 80, align: 'center' },
                { header: 'FIRMA\nSALIDA', width: 80, align: 'center' },
                { header: 'OBSERVACIONES', width: 82, align: 'center' }
            ];

            const rowHeight = 35;
            const headerHeight = 32;

            let xPos = margin;
            doc.font('Helvetica-Bold').fontSize(8);

            doc.rect(margin, currentY, usableWidth, headerHeight).fill(headerBgColor);

            doc.fillColor('#FFF');
            cols.forEach(col => {
                doc.text(col.header, xPos, currentY + (col.header.includes('\n') ? 7 : 12), {
                    width: col.width,
                    align: col.align as any
                });
                xPos += col.width;
            });

            currentY += headerHeight;

            doc.font('Helvetica').fontSize(10).fillColor('#000');

            data.forEach((item, index) => {
                if (currentY + rowHeight > pageHeight - 120) {
                    doc.addPage();
                    currentY = 100;

                    xPos = margin;
                    doc.rect(margin, currentY, usableWidth, headerHeight).fill(headerBgColor);
                    doc.fillColor('#FFF').font('Helvetica-Bold');
                    cols.forEach(col => {
                        doc.text(col.header, xPos, currentY + (col.header.includes('\n') ? 7 : 12), {
                            width: col.width,
                            align: col.align as any
                        });
                        xPos += col.width;
                    });
                    currentY += headerHeight;
                    doc.font('Helvetica').fillColor('#000');
                }

                xPos = margin;
                const displayName = filters.tipo_postulacion === 'compulsa'
                    ? (item.persona?.nombre_completo || '-')
                    : `${item.persona?.paterno || ''} ${item.persona?.materno || ''}, ${item.persona?.nombre || ''}`.trim().replace(/,\s*$/, '');

                const rowData = [
                    (index + 1).toString(),
                    displayName.toUpperCase(),
                    item.ci,
                    '',
                    '',
                    ''
                ];

                doc.rect(margin, currentY, usableWidth, rowHeight).stroke();

                rowData.forEach((text, colIndex) => {
                    if (colIndex > 0) {
                        doc.moveTo(xPos, currentY).lineTo(xPos, currentY + rowHeight).stroke();
                    }

                    doc.text(text, xPos + 2, currentY + 14, {
                        width: cols[colIndex].width - 4,
                        align: (colIndex === 1) ? 'left' : 'center' as any
                    });
                    xPos += cols[colIndex].width;
                });

                currentY += rowHeight;
            });

            // ==================== SUMMARY BOX ====================
            currentY += 15; // Reduced padding
            if (currentY + 150 > pageHeight - margin) {
                doc.addPage();
                currentY = 120;
            }

            const footerLabelWidth = 180;
            const footerRowHeight = 22;

            const drawFooterRow = (label: string, value: string = '') => {
                doc.rect(margin, currentY, footerLabelWidth, footerRowHeight).fill(headerBgColor);
                doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(8).text(label, margin + 5, currentY + 6, { width: footerLabelWidth - 10, align: 'center' });
                doc.rect(margin + footerLabelWidth, currentY, usableWidth - footerLabelWidth, footerRowHeight).stroke();
                doc.fillColor('#000').font('Helvetica').text(value, margin + footerLabelWidth + 10, currentY + 6);
                currentY += footerRowHeight;
            };

            drawFooterRow('N° DE POSTULANTES PRESENTES');
            drawFooterRow('N° DE POSTULANTES AUSENTES');
            drawFooterRow('N° DE POSTULANTES INHABILITADOS');

            doc.rect(margin, currentY, footerLabelWidth, footerRowHeight).fill(headerBgColor);
            doc.fillColor('#FFF').font('Helvetica-Bold').text('NOMBRE DEL\nRESPONSABLE DE AULA', margin, currentY + 4, { width: footerLabelWidth, align: 'center' });
            doc.rect(margin + footerLabelWidth, currentY, usableWidth - footerLabelWidth - 120, footerRowHeight).stroke();

            doc.rect(pageWidth - margin - 120, currentY, 40, footerRowHeight).fill(headerBgColor);
            doc.fillColor('#FFF').text('CELULAR', pageWidth - margin - 120, currentY + 7, { width: 40, align: 'center' });
            doc.rect(pageWidth - margin - 80, currentY, 80, footerRowHeight).stroke();

            currentY += footerRowHeight;

            doc.rect(margin, currentY, footerLabelWidth, 40).fill(headerBgColor);
            doc.fillColor('#FFF').text('FIRMA', margin, currentY + 15, { width: footerLabelWidth, align: 'center' });
            doc.rect(margin + footerLabelWidth, currentY, usableWidth - footerLabelWidth, 40).stroke();

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
