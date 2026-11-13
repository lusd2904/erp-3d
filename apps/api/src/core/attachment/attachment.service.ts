import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { ParamService } from '../param.service';
import { BizError } from '../../common/biz-error';
import { AuthUser } from '../../common/request-context';
import { STORAGE_DRIVER, StorageDriver } from '../../common/storage/storage.driver';

@Injectable()
export class AttachmentService {
  constructor(
    private db: DbService,
    private paramService: ParamService,
    @Inject(STORAGE_DRIVER) private storage: StorageDriver,
  ) {}

  async list(objectCode: string, billId: number) {
    return this.db.q(
      `SELECT id, file_name AS name, size, mime, storage, uploader_id AS uploaderId, created_at AS time
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
    const safeName = file.originalname.replace(/[/\\?%*:|"<>]/g, '_');
    const key = `${safeObj}/${yyyy}/${mm}/${id}-${safeName}`;
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 先 put 存储再插库
    await this.storage.put(key, file.buffer, file.mimetype || null);

    try {
      await this.db.exec(
        `INSERT INTO sys_attachment (id, object_code, bill_id, file_name, path, size, mime, sha256, uploader_id, storage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, objectCode, billId, file.originalname, key, file.size, file.mimetype || null, sha256, user.id, this.storage.kind],
      );
    } catch (dbErr) {
      // 插库失败时尝试删除已上传的对象
      try {
        await this.storage.delete(key);
      } catch {
        /* 忽略存储删除失败 */
      }
      throw dbErr;
    }

    return {
      id,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
      path: key,
      storage: this.storage.kind,
      uploaderId: user.id,
      time: now,
    };
  }

  async getFile(id: number) {
    const row = await this.db.one<any>(`SELECT * FROM sys_attachment WHERE id = ?`, [id]);
    if (!row) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件不存在');

    const attachStorage = row.storage || 'local';
    if (attachStorage !== this.storage.kind) {
      throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件存储位置与当前存储配置不一致');
    }

    const stream = await this.storage.get(row.path);
    return { row, stream };
  }

  async delete(id: number, user: AuthUser) {
    const row = await this.db.one<any>(`SELECT id, path, storage, uploader_id FROM sys_attachment WHERE id = ?`, [id]);
    if (!row) return { ok: true };

    if (!user.isSuper && Number(row.uploader_id) !== user.id) {
      throw new BizError(ErrorCodes.PERM_DENIED, '仅上传人或管理员可删除该附件');
    }

    // 先删库再删对象（对象删除失败忽略）
    await this.db.exec(`DELETE FROM sys_attachment WHERE id = ?`, [id]);

    try {
      await this.storage.delete(row.path);
    } catch {
      /* 忽略对象删除失败 */
    }

    return { ok: true };
  }
}
