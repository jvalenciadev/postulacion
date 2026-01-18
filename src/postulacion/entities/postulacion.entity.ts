import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('postulacion_esfm')
export class Postulacion {
    @Column({ nullable: true })
    departamento: string;

    @Column({ nullable: true })
    esfm: string;

    @Column({ nullable: true })
    municipio: string;

    @Column({ nullable: true })
    recinto: string;

    @Column({ nullable: true })
    direccion: string;

    @Column({ nullable: true })
    fecha: string;

    @Column({ nullable: true })
    aula: string;

    @Column({ nullable: true })
    turno: string;

    @Column({ nullable: true })
    equipo: string;

    @PrimaryColumn()
    ci: string;
}
