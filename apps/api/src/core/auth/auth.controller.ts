import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, AllowMustChangePwd, CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/request-context';
import { AuthService } from './auth.service';

@ApiTags('鉴权认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '账号密码登录' })
  login(@Body() body: { username?: string; password?: string }, @Req() req: Request) {
    const ip = (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip) || '';
    return this.authService.login(body, ip);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    const ip = (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip) || '';
    return this.authService.refresh(body?.refreshToken, ip);
  }

  @ApiBearerAuth()
  @AllowMustChangePwd()
  @Post('logout')
  @ApiOperation({ summary: '退出登录并吊销令牌' })
  logout(@CurrentUser() user: AuthUser, @Body() body: { refreshToken?: string }) {
    return this.authService.logout(user.id, body?.refreshToken);
  }

  @ApiBearerAuth()
  @AllowMustChangePwd()
  @Post('change-pwd')
  @ApiOperation({ summary: '修改密码' })
  changePwd(@CurrentUser() user: AuthUser, @Body() body: { oldPassword?: string; newPassword?: string }) {
    return this.authService.changePwd(user.id, body);
  }

  @ApiBearerAuth()
  @AllowMustChangePwd()
  @Get('me')
  @ApiOperation({ summary: '获取当前用户个人信息与权限概览' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.id);
  }
}
