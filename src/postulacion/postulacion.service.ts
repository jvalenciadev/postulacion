import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Postulacion } from './entities/postulacion.entity';

@Injectable()
export class PostulacionService {
    constructor(
        @InjectRepository(Postulacion)
        private postulacionRepo: Repository<Postulacion>,
    ) { }

    async verifyCi(ci: string): Promise<any> {
        const postulante = await this.postulacionRepo.findOne({
            where: { ci },
            relations: ['departamento', 'recinto', 'persona']
        });

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
}
