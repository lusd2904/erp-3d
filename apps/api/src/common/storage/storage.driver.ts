import { Readable } from 'stream'; // [人工修正 反重力] StreamableFile 需要 Readable
export interface StorageDriver {
  readonly kind: 'local' | 's3';
  put(key: string, body: Buffer, mime?: string | null): Promise<void>;
  get(key: string): Promise<Readable>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

/**
 * 校验存储对象 key，防路径遍历。
 * 拒绝含 '..'、以 '/' 开头、含反斜杠的 key。
 */
export function safeKey(key: string): string {
  if (!key || typeof key !== 'string') {
    throw new Error('存储 key 不能为空');
  }
  if (key.startsWith('/')) {
    throw new Error(`非法存储 key: 不能以 '/' 开头: ${key}`);
  }
  if (key.includes('..')) {
    throw new Error(`非法存储 key: 不能包含 '..': ${key}`);
  }
  if (key.includes('\\')) {
    throw new Error(`非法存储 key: 不能包含反斜杠: ${key}`);
  }
  return key;
}
