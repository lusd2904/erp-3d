import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createDataSource } from './data-source';
import { DbService } from './db.service';
import { setWorkerId } from './snowflake';
import { config } from '../config/config';

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        setWorkerId(config.workerId);
        const ds = createDataSource();
        await ds.initialize();
        return ds;
      },
    },
    DbService,
  ],
  exports: [DataSource, DbService],
})
export class DbModule {}
