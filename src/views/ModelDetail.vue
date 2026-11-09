<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import data from '../data/models.json'
import ThreeViewer from '../components/ThreeViewer.vue'

/**
 * 详情页 —— 本项目的核心页面
 * 左边是 Three.js 三维查看器，右边是属性面板。
 * 点击模型构件 → viewer 抛出 select 事件 → 这里更新面板内容。
 */
const props = defineProps({
  id: { type: String, required: true },
})

const model = computed(() => data.models.find((m) => m.id === props.id))

const wireframe = ref(false)
const selected = ref(null)      // 被选中的构件（Three.js 的 Object3D）
const viewerKey = ref(0)        // 改 key 可以强制重建组件（用于「重置」）

// 程序化生成的参数：不同模型给不同尺寸，让它看起来不一样
const params = computed(() => {
  const m = model.value
  if (!m) return {}
  return {
    floors: m.floors,
    floorHeight: Math.max(2.6, Math.round((m.height / m.floors) * 10) / 10),
    width: m.category === '工业' ? 18 : m.category === '商业' ? 14 : 10,
    depth: m.category === '工业' ? 12 : 8,
    winPerFace: m.category === '商业' ? 5 : 4,
  }
})

function onSelect(obj) {
  selected.value = obj || null
}

function onLoaded() {
  // 模型加载完成后的钩子（可以在这里收起 loading 动画等）
}

function onError(err) {
  console.warn('[viewer] 加载失败：', err)
}
</script>

<template>
  <div class="page detail" v-if="model">
    <RouterLink to="/" class="back">← 返回列表</RouterLink>

    <div class="detail-grid">
      <!-- 左：三维查看器 -->
      <div class="viewer-wrap">
        <ThreeViewer
          :key="viewerKey"
          :model-url="model.url"
          :params="params"
          :wireframe="wireframe"
          @select="onSelect"
          @loaded="onLoaded"
          @error="onError"
        />

        <div class="viewer-toolbar">
          <button class="btn" :class="{ 'is-active': wireframe }" @click="wireframe = !wireframe">
            {{ wireframe ? '线框：开' : '线框：关' }}
          </button>
          <button class="btn" @click="viewerKey++">重置视角</button>
        </div>
      </div>

      <!-- 右：属性面板 -->
      <aside class="side">
        <h1 class="page-title">{{ model.name }}</h1>
        <span class="tag">{{ model.category }}</span>

        <p class="desc">{{ model.desc }}</p>

        <dl class="attrs">
          <div><dt>层数</dt><dd>{{ model.floors }} 层</dd></div>
          <div><dt>高度</dt><dd>{{ model.height }} m</dd></div>
          <div><dt>面积</dt><dd>{{ model.area }} m²</dd></div>
          <div><dt>数据来源</dt><dd>{{ model.source }}</dd></div>
        </dl>

        <h2 class="side-h2">构件信息</h2>
        <div class="selected-box">
          <template v-if="selected">
            <div class="row"><span>名称</span><b>{{ selected.name || '未命名' }}</b></div>
            <div class="row"><span>类型</span><b>{{ selected.userData?.type || '构件' }}</b></div>
            <div class="row"><span>楼层</span><b>{{ selected.userData?.floor || '—' }}</b></div>
          </template>
          <p v-else class="hint">在左侧模型上点击任意构件查看属性。</p>
        </div>
      </aside>
    </div>
  </div>

  <!-- 找不到这个 id -->
  <div v-else class="page">
    <div class="state">
      <p>没有找到 id 为「{{ id }}」的模型。</p>
      <RouterLink to="/" class="btn" style="display:inline-block;margin-top:12px">返回列表</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.back { display: inline-block; color: var(--sub); font-size: 14px; margin-bottom: 18px; }
.back:hover { color: var(--text); }

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 1000px) {
  .detail-grid { grid-template-columns: 1fr; }
}

.viewer-wrap { position: relative; }
.viewer-toolbar {
  position: absolute; left: 14px; bottom: 14px;
  display: flex; gap: 8px; z-index: 10;
}

.side {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 12px; padding: 20px;
}
.desc { color: var(--sub); font-size: 14px; margin: 14px 0 18px; }

.attrs { margin: 0 0 22px; padding: 0; }
.attrs > div {
  display: flex; justify-content: space-between;
  padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 14px;
}
.attrs dt { color: var(--sub); margin: 0; }
.attrs dd { margin: 0; font-weight: 600; }

.side-h2 { font-size: 15px; margin-bottom: 10px; }
.selected-box {
  background: var(--panel-2); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px; min-height: 96px;
}
.selected-box .row {
  display: flex; justify-content: space-between;
  font-size: 13.5px; padding: 5px 0;
}
.selected-box .row span { color: var(--sub); }
.hint { color: var(--sub); font-size: 13px; margin: 0; }
</style>
