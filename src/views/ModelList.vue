<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import data from '../data/models.json'

/**
 * 列表页
 * 数据目前直接 import 本地 JSON。
 * 下一步（里程碑 2）把它换成 services/modelApi.js，
 * 用 Promise + setTimeout 模拟网络延迟，就能演示「加载态 / 错误态」了。
 */
const models = ref(data.models)
const categories = ref(data.categories)

const activeCategory = ref('全部')
const keyword = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return models.value.filter((m) => {
    const byCat = activeCategory.value === '全部' || m.category === activeCategory.value
    const byKw = !kw ||
      m.name.toLowerCase().includes(kw) ||
      m.category.toLowerCase().includes(kw)
    return byCat && byKw
  })
})
</script>

<template>
  <div class="page">
    <h1 class="page-title">模型资产</h1>
    <p class="page-sub">共 {{ filtered.length }} / {{ models.length }} 个模型</p>

    <!-- 筛选 -->
    <div class="filters">
      <button
        v-for="c in categories"
        :key="c"
        class="btn"
        :class="{ 'is-active': activeCategory === c }"
        @click="activeCategory = c"
      >
        {{ c }}
      </button>

      <input
        v-model="keyword"
        class="search"
        type="search"
        placeholder="搜索模型名称…"
      />
    </div>

    <!-- 网格 -->
    <div v-if="filtered.length" class="grid">
      <RouterLink
        v-for="m in filtered"
        :key="m.id"
        class="card"
        :to="{ name: 'model-detail', params: { id: m.id } }"
      >
        <div class="card-thumb">▣</div>
        <div class="card-body">
          <h3>{{ m.name }}</h3>
          <span class="tag">{{ m.category }}</span>
          <div class="card-meta">
            <span>{{ m.floors }} 层</span>
            <span>{{ m.height }} m</span>
            <span>{{ m.area }} m²</span>
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- 空态 -->
    <div v-else class="state">
      没有匹配的模型，换个关键词或分类试试。
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px;
  margin-bottom: 24px;
}
.search {
  margin-left: auto; min-width: 220px; height: 38px; padding: 0 14px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--panel-2); color: var(--text);
  font: inherit; font-size: 14px; outline: none;
}
.search:focus { border-color: var(--blue); }
</style>
