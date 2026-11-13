module.exports = {
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', isolatedModules: true }] },
  testEnvironment: 'node',
  testTimeout: 60000,
  globalSetup: '<rootDir>/test/global-setup.js',
  setupFiles: ['<rootDir>/test/setup-env.js'],
  moduleNameMapper: { '^@erp3d/shared$': '<rootDir>/../../packages/shared/src' },
};
