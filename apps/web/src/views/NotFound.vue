<template>
  <div class="not-found-page">
    <el-result
      icon="warning"
      title="404"
      :sub-title="t('common.notFound')"
    >
      <template #extra>
        <el-button type="primary" @click="handleBackHome">
          {{ t('common.backHome') }}
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();

function handleBackHome() {
  router.push('/home');
}
</script>

<style scoped lang="scss">
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  background-color: var(--erp-bg);
}
</style>
