/**
 * Mock 服务开关控制器
 */
export function isMockEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. URL 参数优先覆盖 (?mock=1 / ?mock=0)
  const params = new URLSearchParams(window.location.search);
  const mockParam = params.get('mock');
  if (mockParam === '1' || mockParam === 'true') {
    localStorage.setItem('erp.mock', '1');
    return true;
  }
  if (mockParam === '0' || mockParam === 'false') {
    localStorage.setItem('erp.mock', '0');
    return false;
  }

  // 2. 本地存储配置
  const stored = localStorage.getItem('erp.mock');
  if (stored === '1') return true;
  if (stored === '0') return false;

  // 3. 环境变量默认值
  return import.meta.env.VITE_USE_MOCK === 'true';
}

export async function startMock(): Promise<void> {
  if (!isMockEnabled()) return;

  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
    quiet: true,
  });
}
