import { Global, Module } from '@nestjs/common';
import { StorageModule } from './storage/storage.module';
import { MysqlLockService } from './mysql-lock.service';
import { JobScheduler } from './job-scheduler.service';

@Global()
@Module({
  imports: [StorageModule],
  providers: [MysqlLockService, JobScheduler],
  exports: [MysqlLockService, JobScheduler, StorageModule],
})
export class PlatformInfraModule {}
