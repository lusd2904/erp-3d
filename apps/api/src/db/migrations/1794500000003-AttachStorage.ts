import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing, c } from '../ddl';

export class AttachStorage1794500000003 implements MigrationInterface {
  name = 'AttachStorage1794500000003';

  async up(qr: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      qr,
      'sys_attachment',
      c('storage', "VARCHAR(10) NOT NULL DEFAULT 'local' COMMENT '存储驱动 local/s3'"),
    );
  }

  async down(): Promise<void> {
    // 平台表生产环境不提供自动回退（生产库禁止 DROP/删除列），回退请用备份恢复。
  }
}
