
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Departamento } from './departamento.entity';

@Entity('recinto')
export class Recinto {
    @PrimaryColumn()
    id_recinto: number;

    @Column()
    recinto_nombre: string;

    @Column()
    dep_id: number;

    @ManyToOne(() => Departamento)
    @JoinColumn({ name: 'dep_id' })
    departamento: Departamento;
}
