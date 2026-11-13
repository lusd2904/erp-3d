import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import 'element-plus/dist/index.css';
import '@/styles/global.scss';

import App from './App.vue';
import router from './router';
import i18n from './i18n';
import { startMock } from './mock-switch';

async function bootstrap() {
  await startMock();

  const app = createApp(App);
  const pinia = createPinia();

  // 注册全部 Element Plus 图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }

  app.use(pinia);
  app.use(router);
  app.use(i18n);
  app.use(ElementPlus, {
    locale: zhCn,
    size: 'default',
  });

  app.mount('#app');
}

void bootstrap();
