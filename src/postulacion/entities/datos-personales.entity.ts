import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('datos_personales')
export class DatosPersonales {
    @PrimaryColumn()
    ci: string;

    @Column({ nullable: true })
    nombre: string;

    @Column({ nullable: true })
    paterno: string;

    @Column({ nullable: true })
    materno: string;

    @Column({ nullable: true })
    nombre_completo: string;

    @Column({ type: 'datetime', nullable: true })
    fecha_actualizado: Date;
}
