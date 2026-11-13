import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { config } from '../../config/config';
import { ParamService } from '../param.service';
import { BizError } from '../../common/biz-error';
import { AuthUser } from '../../common/request-context';

@Injectable()
export class AttachmentService {
  constructor(
    private db: DbService,
    private paramService: ParamService,
  ) {}

  async list(objectCode: string, billId: number) {
    return this.db.q(
      `SELECT id, file_name AS name, size, mime, uploader_id AS uploaderId, created_at AS time
       FROM sys_attachment WHERE object_code = ? AND bill_id = ? ORDER BY id DESC`,
      [objectCode, billId],
    );
  }

  async upload(file: Express.Multer.File, objectCode: string, billId: number, user: AuthUser) {
    if (!file) throw new BizError(ErrorCodes.SYS_VALIDATION, '未上传文件');
    if (!objectCode || !billId) throw new BizError(ErrorCodes.SYS_VALIDATION, '业务对象与单据ID必填');

    const maxMB = await this.paramService.getInt('attachment', 'maxSizeMB', 50);
    if (file.size > maxMB * 1024 * 1024) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, `附件大小不能超过 ${maxMB}MB`);
    }

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const id = nextId();

    const safeObj = objectCode.replace(/[^a-zA-Z0-9_]/g, '');
    const relDir = path.join(safeObj, yyyy, mm);
    const absDir = path.join(config.filesDir, relDir);
    if (!fs.existsSync(absDir)) {
      fs.mkdirSync(absDir, { recursive: true });
    }

    const safeName = file.originalname.replace(/[/\\?%*:|"<>]/g, '_');
    const diskFileName = `${id}-${safeName}`;
    const absFilePath = path.join(absDir, diskFileName);
    fs.writeFileSync(absFilePath, file.buffer);

    const relPath = path.join(relDir, diskFileName).replace(/\\/g, '/');
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    await this.db.exec(
      `INSERT INTO sys_attachment (id, object_code, bill_id, file_name, path, size, mime, sha256, uploader_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, objectCode, billId, file.originalname, relPath, file.size, file.mimetype || null, sha256, user.id],
    );

    return {
      id,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
      path: relPath,
      uploaderId: user.id,
      time: now,
    };
  }

  async getFile(id: number) {
    const row = await this.db.one<any>(`SELECT * FROM sys_attachment WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件不存在');
    const absPath = path.resolve(config.filesDir, row.path);
    if (!fs.existsSync(absPath)) {
      throw new BizError(ErrorCodes.SYS_NOT_FOUND, '磁盘上的附件物理文件丢失');
    }
    return { row, absPath };
  }

  async delete(id: number, user: AuthUser) {
    const row = await this.db.one<any>(`SELECT id, path, uploader_id FROM sys_attachment WHERE id = ?`, [id]);
    if (!row) return { ok: true };

    if (!user.isSuper && Number(row.uploader_id) !== user.id) {
      throw new BizError(ErrorCodes.PERM_DENIED, '仅上传人或管理员可删除该附件');
    }

    const absPath = path.resolve(config.filesDir, row.path);
    if (fs.existsSync(absPath)) {
      try {
        fs.unlinkSync(absPath);
      } catch {
        /* 忽略物理文件删除失败 */
      }
    }

    await this.db.exec(`DELETE FROM sys_attachment WHERE id = ?`, [id]);
    return { ok: true };
  }
}
