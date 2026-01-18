import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostulacionService } from './postulacion.service';
import { PostulacionController } from './postulacion.controller';
import { Postulacion } from './entities/postulacion.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Postulacion])],
    controllers: [PostulacionController],
    providers: [PostulacionService],
})
export class PostulacionModule { }
