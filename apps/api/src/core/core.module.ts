import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config/config';
import { PermService } from './perm.service';
import { ParamService } from './param.service';
import { OpLogService } from './oplog.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { CodingService } from './coding/coding.service';
import { CodingController } from './coding/coding.controller';
import { AttachmentService } from './attachment/attachment.service';
import { AttachmentController } from './attachment/attachment.controller';
import { MessageService } from './message/message.service';
import { MessageController } from './message/message.controller';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { RoleService } from './role/role.service';
import { RoleController } from './role/role.controller';
import { OrgService } from './org/org.service';
import {
  OrgController,
  DeptController,
  PositionController,
  EmployeeController,
} from './org/org.controller';
import { ParamController } from './param/param.controller';
import { DictService } from './dict/dict.service';
import { DictController } from './dict/dict.controller';
import { LogController } from './log/log.controller';
import { WsGateway } from './ws/ws.gateway';
import { AuthGuard } from '../common/auth.guard';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { ApiLogInterceptor } from '../common/api-log.interceptor';
import { ResponseInterceptor } from '../common/response.interceptor';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.accessTtl as any },
    }),
  ],
  providers: [
    PermService,
    ParamService,
    OpLogService,
    AuthService,
    CodingService,
    AttachmentService,
    MessageService,
    UserService,
    RoleService,
    OrgService,
    DictService,
    WsGateway,
    AuthGuard,
    IdempotencyInterceptor,
    ApiLogInterceptor,
    ResponseInterceptor,
  ],
  controllers: [
    AuthController,
    CodingController,
    AttachmentController,
    MessageController,
    UserController,
    RoleController,
    OrgController,
    DeptController,
    PositionController,
    EmployeeController,
    ParamController,
    DictController,
    LogController,
  ],
  exports: [
    JwtModule,
    PermService,
    ParamService,
    OpLogService,
    AuthService,
    CodingService,
    AttachmentService,
    MessageService,
    UserService,
    RoleService,
    OrgService,
    DictService,
    WsGateway,
    AuthGuard,
    IdempotencyInterceptor,
    ApiLogInterceptor,
    ResponseInterceptor,
  ],
})
export class CoreModule {}
