/**
 * 跑迁移：pnpm migrate（开发）/ node dist/db/migrate.js（生产镜像）。
 * 每个迁移本身也是幂等的（ensureTable / upsert），重复执行或部分执行后再跑都安全。
 */
import { createDataSource } from './data-source';

export async function runMigrations(database?: string) {
  const ds = createDataSource(database ? { database } : {});
  await ds.initialize();
  try {
    const done = await ds.runMigrations({ transaction: 'each' });
    return done.map((m) => m.name);
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  runMigrations()
    .then((names) => {
      console.log(names.length ? `已执行迁移：\n  ${names.join('\n  ')}` : '没有待执行的迁移');
      process.exit(0);
    })
    .catch((e) => {
      console.error('迁移失败', e);
      process.exit(1);
    });
}
