import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/LoginView.vue'),
    meta: { title: 'menu.login', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Workbench',
        component: () => import('@/views/home/WorkbenchView.vue'),
        meta: { title: 'menu.workbench', closable: false },
      },
      {
        path: 'bill/:form',
        name: 'BillList',
        component: () => import('@/views/bill/BillListView.vue'),
        meta: { title: 'bill.list.title' },
      },
      {
        path: 'bill/:form/:id',
        name: 'BillEdit',
        component: () => import('@/views/bill/BillEditView.vue'),
        meta: { title: 'bill.edit.title' },
      },
    ],
  },
  {
    path: '/pda',
    component: () => import('@/layouts/PdaLayout.vue'),
    children: [
      {
        path: '',
        name: 'PdaHome',
        component: () => import('@/views/pda/PdaHomeView.vue'),
        meta: { title: 'menu.pda' },
      },
      {
        path: 'scan/:task',
        name: 'PdaScan',
        component: () => import('@/views/pda/PdaScanView.vue'),
        meta: { title: 'pda.scan' },
      },
    ],
  },
  {
    path: '/hmi',
    component: () => import('@/layouts/HmiLayout.vue'),
    children: [
      {
        path: '',
        name: 'HmiStation',
        component: () => import('@/views/hmi/HmiStationView.vue'),
        meta: { title: 'menu.hmi' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: 'common.notFound' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const rawAuth = localStorage.getItem('erp.auth');
  let isLoggedIn = false;
  if (rawAuth) {
    try {
      const parsed = JSON.parse(rawAuth);
      isLoggedIn = !!parsed?.accessToken;
    } catch {
      isLoggedIn = false;
    }
  }

  if (to.path === '/login') {
    if (isLoggedIn) {
      next('/home');
    } else {
      next();
    }
    return;
  }

  if (!isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    });
    return;
  }

  next();
});

export default router;
