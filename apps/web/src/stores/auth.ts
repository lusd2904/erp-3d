import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { UserInfo } from '@/types/auth';
import { authApi } from '@/api/auth';

interface AuthStorageData {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
}

function loadInitialAuth(): AuthStorageData {
  try {
    const raw = localStorage.getItem('erp.auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        accessToken: parsed.accessToken || null,
        refreshToken: parsed.refreshToken || null,
        user: parsed.user || null,
      };
    }
  } catch {
    // 忽略异常
  }
  return { accessToken: null, refreshToken: null, user: null };
}

export const useAuthStore = defineStore('auth', () => {
  const initial = loadInitialAuth();
  const user = ref<UserInfo | null>(initial.user);
  const accessToken = ref<string | null>(initial.accessToken);
  const refreshToken = ref<string | null>(initial.refreshToken);

  const isLoggedIn = computed(() => !!accessToken.value);

  function saveToStorage() {
    try {
      localStorage.setItem(
        'erp.auth',
        JSON.stringify({
          accessToken: accessToken.value,
          refreshToken: refreshToken.value,
          user: user.value,
        })
      );
    } catch {
      // 忽略存储异常
    }
  }

  async function login(credentials: { username: string; password: string }) {
    const res = await authApi.login(credentials);
    accessToken.value = res.accessToken;
    refreshToken.value = res.refreshToken;
    user.value = res.user;
    saveToStorage();
    return res;
  }

  function setTokens(access: string, refresh?: string) {
    accessToken.value = access;
    if (refresh) refreshToken.value = refresh;
    saveToStorage();
  }

  function setUser(u: UserInfo | null) {
    user.value = u;
    saveToStorage();
  }

  function logout() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem('erp.auth');
  }

  return {
    user,
    accessToken,
    refreshToken,
    isLoggedIn,
    login,
    logout,
    setTokens,
    setUser,
  };
});
