import { Global, Module } from '@nestjs/common';
import { AppConfig, config } from '../../config/config';
import { STORAGE_DRIVER, StorageDriver } from './storage.driver';
import { LocalDiskDriver } from './local-disk.driver';
import { S3Driver } from './s3.driver';

export function createStorageDriver(cfg: AppConfig): StorageDriver {
  if (cfg.storage.driver === 's3') {
    const { endpoint, accessKeyId, secretAccessKey } = cfg.storage.s3;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('ATTACH_STORAGE=s3 需要环境变量 S3_ENDPOINT、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY');
    }
    return new S3Driver(cfg.storage.s3);
  }
  return new LocalDiskDriver(cfg.filesDir);
}

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      useFactory: () => createStorageDriver(config),
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
