import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PostulacionService } from './postulacion.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller()
@UseGuards(ApiKeyGuard)
export class PostulacionController {
    constructor(private readonly postulacionService: PostulacionService) { }

    @Post()
    verify(@Body('ci') ci: string) {
        return this.postulacionService.verifyCi(ci);
    }
}
