# erp3d — 电子元器件生产 ERP 完整系统

monorepo（pnpm workspace）：

| 目录 | 内容 | 负责 |
|---|---|---|
| `apps/api` | NestJS + TypeScript 后端（平台核心、单据引擎、审批流、各业务模块） | 主 bot 执行线 + 第二波各业务 bot |
| `apps/web` | Vue 3 前端（WP16） | 前端 bot |
| `packages/shared` | 共享类型：单据元数据 schema、状态码、错误码、表达式引擎、审批模型 | 主 bot 执行线 |
| `docs/` | `平台开发约定.md`（**写业务模块前必读**）、`进度.md` | |
| `docker/` | Dockerfile（amd64，node:20-alpine 多阶段）、本地开发 compose | |
| `scripts/` | 本地开发库启停脚本 | |

## 快速开始

```bash
pnpm install
./scripts/dev-db.sh up          # docker 起 MySQL 8：容器 erp3d-dev-mysql，数据卷 ../devdata/mysql
cp apps/api/.env.example apps/api/.env
pnpm migrate                    # 跑迁移（可重复执行）
pnpm --filter @erp3d/api start:dev
# Swagger: http://localhost:3000/api/docs   默认管理员 admin / Admin@123（首次登录须改密）
pnpm test && pnpm test:e2e
```

镜像：`docker build --platform linux/amd64 -f docker/Dockerfile -t erp3d-api:dev .`
