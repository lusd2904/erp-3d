import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/request-context';
import { MessageService } from './message.service';

@ApiTags('站内消息')
@ApiBearerAuth()
@Controller('messages')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: '当前用户消息列表' })
  list(@CurrentUser() user: AuthUser, @Query() q: { unread?: string; page?: string; size?: string }) {
    return this.messageService.list(user.id, q);
  }

  @Get('unread-count')
  @ApiOperation({ summary: '未读消息总数' })
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.messageService.unreadCount(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记单条消息已读' })
  read(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messageService.markAsRead(Number(id), user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '全部消息标记已读' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.messageService.markAllAsRead(user.id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '紧急消息已阅确认' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.messageService.confirm(Number(id), user.id);
  }
}
