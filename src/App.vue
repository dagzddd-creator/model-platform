<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="brand">三维模型<span>资产平台</span></RouterLink>
    <nav>
      <RouterLink to="/">模型列表</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
    </nav>
  </header>

  <main>
    <RouterView />
  </main>
</template>
