<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="page">
    <div class="state">
      <p style="font-size:34px;margin:0 0 10px">404</p>
      <p>这个页面不存在。</p>
      <RouterLink to="/" class="btn" style="display:inline-block;margin-top:14px">返回模型列表</RouterLink>
    </div>
  </div>
</template>
