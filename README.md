# 电子元器件生产管理 ERP（erp3d）

私有仓库。这是面向电子元器件制造的生产管理 ERP：覆盖计划、生产、委外、采购、库存与条码、质量、车间执行、设备采集等业务，后端为 NestJS + TypeScript + MySQL，前端规划为 Vue 3（浅色、中文）。

仓库主体是完整系统的 git 历史（原工作目录 `/workspace/erp-3d/fullsys/code`），并补充了需求规格、技术方案、模块设计、界面设计图、金蝶参考资料、谷歌云盘「erp设计」导出，以及早期三维演示。

**最新业务代码在分支 `wp10-inventory`，不在 `main`。** `main` 是脚手架起点，已另外放入本说明和当前进度，方便默认分支打开即可了解项目。详细进度见 [`docs/当前进度.md`](docs/当前进度.md)。`docs/进度.md` 是历史交接稿，其中「代码未提交」等记录已经过时，请以 `docs/当前进度.md` 和 git 提交为准。

## 如何开始

环境：Node.js ≥ 20，pnpm（仓库声明 `pnpm@10.34.6`），Docker（本地 MySQL）。

```bash
pnpm install
./scripts/dev-db.sh up          # 启动 MySQL 8：容器 erp3d-dev-mysql，端口 3307，库 erp3d / erp3d_test
cp apps/api/.env.example apps/api/.env   # 填入本地开发凭据，不要提交 .env
# 跑 e2e 还需自行准备 apps/api/test/test.env（模板见 apps/api/test/test.env.example，不要提交真实密钥）
pnpm migrate                    # 迁移可重复执行
pnpm --filter @erp3d/api start:dev
# Swagger: http://localhost:8080/api/docs
# 默认管理员账号见 apps/api 启动说明；首次登录须改密
pnpm test && pnpm test:e2e
```

前端骨架在分支 `wp16` 的 `apps/web/`，当前 `wp10-inventory` / `main` 上仅有空目录占位。

## 目录结构

| 路径 | 说明 |
|---|---|
| `apps/api` | NestJS 后端（平台核心、单据引擎、审批流、库存/质量进行中） |
| `apps/web` | Vue 3 前端（完整骨架在 `wp16` 分支） |
| `packages/shared` | 共享类型：单据元数据 schema、状态码、错误码、表达式引擎 |
| `docs/` | 平台开发约定、历史进度、WP03 设计与复核 |
| `docs/当前进度.md` | **当前进度（以 git 分支/提交核对）** |
| `docs/erp设计/` | 谷歌云盘「erp设计」全部导出（docx / zip / MANIFEST） |
| `scripts/dev-db.sh` | 本地开发库启停 |
| `project-docs/` | 需求说明书、技术方案、调研、交接等 Markdown 原文 |
| `project-docs/export/` | 本地 `fullsys/export` 打包（与云盘资料有重叠，见该目录说明） |
| `design/` | 各模块详细设计（WP05/06/07/08/10/11/12/13） |
| `ui/` | 界面设计图 PNG 与 `ui/src` 源稿 |
| `review/` | 前期独立提炼材料 |
| `kingdee-digest/` `kingdee-modules/` `kingdee-notes/` `kingdee-raw/` | 金蝶参考资料 |
| `demo-3d/` | 早期三维可视化演示（与完整系统分开） |

代码原有的 `docs/平台开发约定.md` 等文件保留在 `docs/`，没有被云盘资料覆盖。

## 分支含义

| 分支 | 提交 | 含义 |
|---|---|---|
| `main` | `9da6bff`（另有资料提交） | 脚手架；默认分支，可直接阅读本说明和当前进度 |
| `wp01-platform-core` | `b1678e9` | WP01 平台核心，已完成 |
| `wp02-bill-engine` | `954cc67` | WP02 单据引擎，已完成 |
| `wp03-workflow` | `8b019cf` | WP03 审批流，已完成（含 WP02 合并） |
| `wp10-inventory` | `6ebd3b8`（另有资料提交） | **当前工作分支**，WP10 库存与条码、WP11 质量进行中 |
| `wp16` | `a4b30d3` | WP16 前端工程骨架，暂停点 |

## 部署与产品约束

- 服务端口 **8080**；每台数据库连接池 **≤ 9**
- 定时任务用 **MySQL 锁** 防止多实例双跑
- 会话使用 **JWT**（或存 MySQL），不落本机会话文件
- 附件走 MinIO / S3 驱动（开发也可 local），凭据只从环境变量读取
- 界面：浅色、中文
- 本地测试库：`erp3d-dev-mysql:3307` 上的 `erp3d_test`

## 安全说明

- 不要提交 `.env`、`apps/api/test/test.env`、私钥、token 或服务器登录资料
- `apps/api/test/test.env` 曾进入 git 历史（含数据库口令和 JWT 密钥）。新提交已从树中删除并写入 `.gitignore`，**没有做历史重写**；克隆完整历史的人仍可能从旧提交里看到。请视为已泄露的开发密钥，必要时轮换
