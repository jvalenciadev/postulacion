import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Departamento } from './departamento.entity';
import { Recinto } from './recinto.entity';
import { DatosPersonales } from './datos-personales.entity';

@Entity('postulacion_esfm')
export class Postulacion {
    @ManyToOne(() => Departamento)
    @JoinColumn({ name: 'dep_id' })
    departamento: Departamento;

    @OneToOne(() => DatosPersonales)
    @JoinColumn({ name: 'ci' })
    persona: DatosPersonales;

    @Column({ nullable: true })
    esfm: string;

    @Column({ nullable: true })
    municipio: string;

    @ManyToOne(() => Recinto)
    @JoinColumn({ name: 'id_recinto' })
    recinto: Recinto;

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
