import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'erp:isPublic';
/** 不需要登录的接口 */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ALLOW_MUST_CHANGE = 'erp:allowMustChange';
/** 首次登录未改密时也允许访问（改密、登出、me） */
export const AllowMustChangePwd = () => SetMetadata(ALLOW_MUST_CHANGE, true);

export const REQUIRE_PERM = 'erp:requirePerm';
/** 功能权限：业务对象 × 权限项，例如 @RequirePerm('sys_user', 'edit') */
export const RequirePerm = (objectCode: string, permCode: string) => SetMetadata(REQUIRE_PERM, { objectCode, permCode });

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
