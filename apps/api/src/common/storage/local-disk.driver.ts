import { Readable } from 'stream'; // [人工修正 反重力] StreamableFile 需要 Readable
import * as fs from 'fs';
import * as path from 'path';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../biz-error';
import { safeKey, StorageDriver } from './storage.driver';

export class LocalDiskDriver implements StorageDriver {
  readonly kind = 'local' as const;

  constructor(private readonly rootDir: string) {}

  private resolvePath(key: string): string {
    const validKey = safeKey(key);
    return path.join(this.rootDir, validKey);
  }

  async put(key: string, body: Buffer, _mime?: string | null): Promise<void> {
    const fullPath = this.resolvePath(key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, body);
  }

  async get(key: string): Promise<Readable> {
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) {
      throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件文件不存在');
    }
    return fs.createReadStream(fullPath);
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.resolvePath(key);
    return fs.existsSync(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.resolvePath(key);
    if (fs.existsSync(fullPath)) {
      try {
        await fs.promises.unlink(fullPath);
      } catch {
        // 忽略文件删除失败
      }
    }
  }
}
