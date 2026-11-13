export interface MenuItem {
  key: string;
  titleKey: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  external?: boolean;
}

export const menus: MenuItem[] = [
  {
    key: 'workbench',
    titleKey: 'menu.workbench',
    icon: 'Odometer',
    path: '/home',
  },
  {
    key: 'base',
    titleKey: 'menu.base',
    icon: 'Files',
    children: [
      {
        key: 'material',
        titleKey: 'menu.material',
        icon: 'Cpu',
      },
      {
        key: 'bom',
        titleKey: 'menu.bom',
        icon: 'Operation',
      },
      {
        key: 'warehouse',
        titleKey: 'menu.warehouse',
        icon: 'House',
      },
    ],
  },
  {
    key: 'purchase',
    titleKey: 'menu.purchase',
    icon: 'ShoppingCart',
    children: [
      {
        key: 'scm_pur_req',
        titleKey: 'menu.purReq',
        icon: 'Document',
        path: '/bill/scm_pur_req',
      },
      {
        key: 'scm_pur_order',
        titleKey: 'menu.purOrder',
        icon: 'Tickets',
        path: '/bill/scm_pur_order',
      },
    ],
  },
  {
    key: 'production',
    titleKey: 'menu.production',
    icon: 'SetUp',
    children: [
      {
        key: 'pp_mo',
        titleKey: 'menu.mo',
        icon: 'Finished',
        path: '/bill/pp_mo',
      },
    ],
  },
  {
    key: 'shopfloor',
    titleKey: 'menu.shopfloor',
    icon: 'Monitor',
    children: [
      {
        key: 'hmi',
        titleKey: 'menu.hmi',
        icon: 'FullScreen',
        path: '/hmi',
        external: true,
      },
    ],
  },
  {
    key: 'warehouseOps',
    titleKey: 'menu.warehouseOps',
    icon: 'Box',
    children: [
      {
        key: 'pda',
        titleKey: 'menu.pda',
        icon: 'Cellphone',
        path: '/pda',
        external: true,
      },
    ],
  },
];
