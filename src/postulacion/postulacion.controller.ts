import { Body, Controller, Get, Post, Render, UseGuards } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller()
export class PostulacionController {
    constructor(private readonly postulacionService: PostulacionService) { }

    @Post()
    @UseGuards(ApiKeyGuard)
    verify(@Body('ci') ci: string) {
        return this.postulacionService.verifyCi(ci);
    }

    @Get('consultar')
    @Render('consultar')
    getConsultarPage() {
        return { layout: false };
    }

    @Post('verificar-becas')
    @UseGuards(ApiKeyGuard)
    verifyBecas(@Body('ci') ci: string) {
        return this.postulacionService.verifyCiBecas(ci);
    }
    
    @Post('verificar-compulsas')
    @UseGuards(ApiKeyGuard)
    verifyCompulsas(@Body('ci') ci?: string, @Body('name') name?: string) {
        return this.postulacionService.verifyCiCompulsas(ci, name);
    }

    @Get('consultarBecas')
    @Render('consultar_becas')
    getConsultarBecasPage() {
        return { layout: false };
    }

    @Get('consultarCompulsas')
    @Render('consultar_compulsas')
    getConsultarCompulsasPage() {
        return { layout: false };
    }
}
