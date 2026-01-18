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
}
