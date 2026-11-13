import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface TabItem {
  key: string; // fullPath
  title: string;
  path: string;
  closable: boolean;
}

const DEFAULT_HOME_TAB: TabItem = {
  key: '/home',
  title: '工作台',
  path: '/home',
  closable: false,
};

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabItem[]>([{ ...DEFAULT_HOME_TAB }]);
  const active = ref<string>('/home');

  function addTab(tab: { key: string; title: string; path: string; closable?: boolean }) {
    const existing = tabs.value.find((t) => t.key === tab.key);
    if (!existing) {
      tabs.value.push({
        key: tab.key,
        title: tab.title,
        path: tab.path,
        closable: tab.closable ?? (tab.key !== '/home'),
      });
    } else if (tab.title && tab.title !== existing.title) {
      existing.title = tab.title;
    }
    active.value = tab.key;
  }

  function closeTab(targetKey: string): string {
    const index = tabs.value.findIndex((t) => t.key === targetKey);
    if (index === -1) return active.value;

    const targetTab = tabs.value[index];
    if (!targetTab.closable) return active.value;

    let nextActive = active.value;
    if (active.value === targetKey) {
      const nextTab = tabs.value[index + 1] || tabs.value[index - 1];
      nextActive = nextTab ? nextTab.key : '/home';
    }

    tabs.value.splice(index, 1);
    active.value = nextActive;
    return nextActive;
  }

  function closeOthers(targetKey: string): string {
    tabs.value = tabs.value.filter((t) => !t.closable || t.key === targetKey);
    active.value = targetKey;
    return targetKey;
  }

  function closeAll(): string {
    tabs.value = tabs.value.filter((t) => !t.closable);
    active.value = '/home';
    return '/home';
  }

  function setTitle(key: string, title: string) {
    const tab = tabs.value.find((t) => t.key === key);
    if (tab) {
      tab.title = title;
    }
  }

  return {
    tabs,
    active,
    addTab,
    closeTab,
    closeOthers,
    closeAll,
    setTitle,
  };
});
