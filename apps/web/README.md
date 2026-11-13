# apps/web（前端，WP16 由前端 bot 负责）

本目录由 WP16 前端 bot 建工程，主 bot 执行线只建空目录。约定：

- 技术栈：Vue 3 + Vite + TypeScript + Element Plus（浅色主题），见《技术方案与分工》1.2。
- 包名 `@erp3d/web`，加入 pnpm workspace 即可引用 `@erp3d/shared`（单据元数据类型、状态码、错误码、接口返回体类型）。
- 后端接口前缀 `/api/v1`，开发时 Vite 代理到 `http://localhost:3000`。接口清单见后端 Swagger：`http://localhost:3000/api/docs`。
- 单据页面按 `GET /api/v1/meta/bills/{form}` 返回的元数据渲染；详情接口返回 `allowedOps`、`lockedFields`，按钮和字段可编辑性一律以后端返回为准，前端不自己判断状态。
- 返回体统一 `{ code, msg, data, traceId }`，`code === 'OK'` 为成功；错误码表见 `packages/shared/src/errors.ts` 和 `docs/平台开发约定.md`。
- 鉴权：`POST /api/v1/auth/login` 换 `accessToken`（2 小时）+ `refreshToken`（7 天），请求头 `Authorization: Bearer <token>`；写操作带 `Idempotency-Key`。
- WebSocket：Socket.IO，路径 `/ws`，握手 `auth: { token }`；事件 `msg.new`、`todo.changed`、`bill.changed`。
- 流程设计器：bpmn-js（保留 bpmn.io 水印），扩展属性命名空间 `erp`（`http://erp3d.local/bpmn`），属性清单见 `docs/平台开发约定.md` 第 8 节。保存前可调 `POST /api/v1/wf/definitions/validate` 校验。
- 不要改 `apps/api`、`packages/shared` 的代码；需要后端改动时提给主 bot 执行线。
