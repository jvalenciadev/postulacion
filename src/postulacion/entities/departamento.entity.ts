
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('departamento')
export class Departamento {
    @PrimaryColumn()
    dep_id: number;

    @Column()
    dep_nombre: string;
}
