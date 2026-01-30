import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike, Between } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';

@Injectable()
export class PostulacionService {
    constructor(
        @InjectRepository(Postulacion)
        private postulacionRepo: Repository<Postulacion>,
    ) { }

    private normalizeName(name: string): string {
        if (!name) return '';
        // Collapse multiple spaces into one and trim
        return name.trim().replace(/\s+/g, ' ');
    }

    async verifyCi(ci: string): Promise<any> {
        let postulante = await this.postulacionRepo.findOne({
            where: { ci, tipoPostulacion: IsNull() },
            relations: ['departamento', 'recinto', 'persona']
        });

        // Double check against 'Becas' string if DB has strings
        if (postulante && postulante.tipoPostulacion === 'Becas') {
            // Treat as not found for this endpoint
            postulante = null;
        }

        if (!postulante) {
            throw new NotFoundException('CI no encontrado o no habilitado');
        }

        const fullName = postulante.persona
            ? `${postulante.persona.paterno || ''} ${postulante.persona.materno || ''}, ${postulante.persona.nombre || ''}`.trim().replace(/,\s*$/, '')
            : '-';

        return {
            ci: postulante.ci,
            nombre_completo: fullName.toUpperCase(),
            departamento: postulante.departamento?.dep_nombre || '-',
            esfm: postulante.esfm,
            municipio: postulante.municipio,
            recinto: postulante.recinto?.recinto_nombre || '-',
            direccion_recinto: postulante.direccion,
            fecha: postulante.fecha,
            aula: postulante.aula,
            turno: postulante.turno,
            equipo: postulante.equipo,
            estado: 'HABILITADO',
        };
    }

    async verifyCiBecas(ci: string): Promise<any> {
        const postulante = await this.postulacionRepo.findOne({
            where: {
                ci,
                tipoPostulacion: 'Becas'
            },
            relations: ['departamento', 'recinto', 'persona']
        });

        if (!postulante) {
            throw new NotFoundException('CI no encontrado o no habilitado para Becas');
        }

        const fullName = postulante.persona
            ? `${postulante.persona.paterno || ''} ${postulante.persona.materno || ''}, ${postulante.persona.nombre || ''}`.trim().replace(/,\s*$/, '')
            : '-';

        return {
            ci: postulante.ci,
            nombre_completo: fullName.toUpperCase(),
            departamento: postulante.departamento?.dep_nombre || '-',
            esfm: postulante.esfm,
            municipio: postulante.municipio,
            recinto: postulante.recinto?.recinto_nombre || '-',
            direccion_recinto: postulante.direccion,
            fecha: postulante.fecha,
            aula: postulante.aula,
            turno: postulante.turno,
            equipo: postulante.equipo,
            discapacidad: postulante.discapacidad, // Included new field
            tipo_postulacion: postulante.tipoPostulacion, // Included new field
            estado: 'HABILITADO',
        };
    }
   
    
    async verifyCiCompulsas(ci?: string, name?: string): Promise<any> {
        let postulante: Postulacion | null = null;
        const start = new Date('2026-01-28T00:00:00');
        const end = new Date('2026-01-28T23:59:59');

        if (ci && ci.trim()) {
            postulante = await this.postulacionRepo.findOne({
                where: {
                    ci: ci.trim(),
                    tipoPostulacion: 'compulsa',
                    persona: { fecha_actualizado: Between(start, end) }
                },
                relations: ['departamento', 'recinto', 'persona']
            });
        }

        if (!postulante && name && name.trim()) {
            const normalizedName = this.normalizeName(name);
            const searchPattern = `%${normalizedName.replace(/\s+/g, '%')}%`;

            postulante = await this.postulacionRepo.findOne({
                where: {
                    persona: {
                        nombre_completo: ILike(searchPattern),
                        fecha_actualizado: Between(start, end)
                    },
                    tipoPostulacion: 'compulsa'
                },
                relations: ['departamento', 'recinto', 'persona']
            });
        }

        if (!postulante) {
            throw new NotFoundException('Postulante no encontrado o no habilitado para Compulsa');
        }

        const fullName = postulante.persona?.nombre_completo ||
            `${postulante.persona?.paterno || ''} ${postulante.persona?.materno || ''} ${postulante.persona?.nombre || ''}`.trim().replace(/\s+/g, ' ');

        return {
            ci: postulante.ci,
            nombre_completo: fullName.toUpperCase(),
            departamento: postulante.departamento?.dep_nombre || '-',
            esfm: postulante.esfm,
            municipio: postulante.municipio,
            recinto: postulante.recinto?.recinto_nombre || '-',
            direccion_recinto: postulante.direccion,
            fecha: postulante.fecha,
            aula: postulante.aula,
            turno: postulante.turno,
            equipo: postulante.equipo,
            cargo: postulante.cargo,
            tipo_postulacion: (postulante.tipoPostulacion || '').toUpperCase(),
            estado: 'HABILITADO',
        };
    }
}
