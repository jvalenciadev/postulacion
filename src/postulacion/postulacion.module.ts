import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostulacionService } from './postulacion.service';
import { PostulacionController } from './postulacion.controller';
import { Postulacion } from './entities/postulacion.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Departamento } from './entities/departamento.entity';
import { Recinto } from './entities/recinto.entity';
import { DatosPersonales } from './entities/datos-personales.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Postulacion, Departamento, Recinto, DatosPersonales])],
    controllers: [PostulacionController, ReportsController],
    providers: [PostulacionService, ReportsService],
})
export class PostulacionModule { }
