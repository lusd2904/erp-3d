import { PlatformCore1794500000001 } from './1794500000001-PlatformCore';
import { PlatformSeed1794500000002 } from './1794500000002-PlatformSeed';
import { AttachStorage1794500000003 } from './1794500000003-AttachStorage';

/** 迁移按时间戳顺序登记在这里（显式列出，打包后不依赖 glob） */
export const ALL_MIGRATIONS = [
  PlatformCore1794500000001,
  PlatformSeed1794500000002,
  AttachStorage1794500000003,
];
