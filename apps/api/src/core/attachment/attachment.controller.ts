import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/request-context';
import { AttachmentService } from './attachment.service';
import { RAW_RESPONSE } from '../../common/response.interceptor';

@ApiTags('附件中心')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentController {
  constructor(private attachmentService: AttachmentService) {}

  @Get()
  @ApiOperation({ summary: '按单据查询附件列表' })
  list(@Query('objectCode') objectCode: string, @Query('billId') billId: string) {
    return this.attachmentService.list(objectCode, Number(billId));
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        objectCode: { type: 'string' },
        billId: { type: 'number' },
      },
    },
  })
  @ApiOperation({ summary: '上传附件' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('objectCode') objectCode: string,
    @Body('billId') billId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attachmentService.upload(file, objectCode, Number(billId), user);
  }

  @Get(':id/file')
  @ApiOperation({ summary: '下载附件文件' })
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { row, stream } = await this.attachmentService.getFile(Number(id));
    res.set({
      'Content-Type': row.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(row.file_name)}"`,
    });
    const sf = new StreamableFile(stream);
    (sf as any)[RAW_RESPONSE] = true;
    return sf;
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除附件' })
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attachmentService.delete(Number(id), user);
  }
}
