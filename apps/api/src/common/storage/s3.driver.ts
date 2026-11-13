import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../biz-error';
import { safeKey, StorageDriver } from './storage.driver';

export interface S3DriverOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  prefix: string;
}

export class S3Driver implements StorageDriver {
  readonly kind = 's3' as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(opts: S3DriverOptions) {
    this.bucket = opts.bucket;
    this.prefix = opts.prefix || '';
    this.client = new S3Client({
      endpoint: opts.endpoint,
      region: opts.region,
      forcePathStyle: opts.forcePathStyle,
      credentials:
        opts.accessKeyId && opts.secretAccessKey
          ? {
              accessKeyId: opts.accessKeyId,
              secretAccessKey: opts.secretAccessKey,
            }
          : undefined,
    });
  }

  private resolveKey(key: string): string {
    const validKey = safeKey(key);
    return this.prefix + validKey;
  }

  async put(key: string, body: Buffer, mime?: string | null): Promise<void> {
    const fullKey = this.resolveKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: body,
        ContentType: mime || 'application/octet-stream',
      }),
    );
  }

  async get(key: string): Promise<Readable> {
    const fullKey = this.resolveKey(key);
    try {
      const res = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
        }),
      );
      if (!res.Body) {
        throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件文件不存在');
      }
      return res.Body as Readable;
    } catch (err: any) {
      if (err instanceof BizError) {
        throw err;
      }
      const name = err?.name;
      const status = err?.$metadata?.httpStatusCode;
      if (name === 'NoSuchKey' || name === 'NotFound' || status === 404) {
        throw new BizError(ErrorCodes.SYS_NOT_FOUND, '附件文件不存在');
      }
      throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const fullKey = this.resolveKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: fullKey,
        }),
      );
      return true;
    } catch (err: any) {
      const name = err?.name;
      const status = err?.$metadata?.httpStatusCode;
      if (name === 'NotFound' || name === 'NoSuchKey' || status === 404) {
        return false;
      }
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.resolveKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      }),
    );
  }
}
