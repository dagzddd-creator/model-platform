<script setup>
/**
 * 关于页 —— 面试官看项目时会点进来
 * 这里写清楚：项目目的、技术栈、以及最难的地方。
 */
const highlights = [
  {
    t: 'Vue 与 Three.js 的集成',
    d: 'Three.js 对象不能放进 Vue 的 reactive —— 响应式代理会破坏它的引用比较机制。用 markRaw / shallowRef 解决。',
  },
  {
    t: '组件卸载时的资源释放',
    d: '仅移除 canvas 不会释放显存。必须在 onBeforeUnmount 里手动 dispose 几何体、材质和渲染器。',
  },
  {
    t: '容器尺寸监听',
    d: '监听 window.resize 在布局变化时不可靠，改用 ResizeObserver 监听容器本身。',
  },
  {
    t: '点击拾取（Raycaster）',
    d: '鼠标坐标 → 标准化设备坐标 → 从相机发射射线 → 求交 → 拿到被选中的构件。',
  },
  {
    t: '模型自动适配',
    d: '不同来源的模型尺寸差异巨大，加载后用包围盒计算缩放与偏移，自动居中并落到地面。',
  },
]
</script>

<template>
  <div class="page">
    <h1 class="page-title">关于这个项目</h1>
    <p class="page-sub">基于 Vue 3 + Vite + Three.js 的三维模型资产浏览平台</p>

    <section class="block">
      <h2>项目目的</h2>
      <p>
        数字孪生行业里，三维模型是核心资产，但通常缺少一个方便浏览和检查的界面。
        这个项目用来演示：如何用前端技术加载、展示和检查三维模型资产。
      </p>
      <p>
        模型数据目前使用本地 JSON，并内置了「程序化生成建筑」作为占位，
        因此不需要任何模型文件也能直接运行。
      </p>
    </section>

    <section class="block">
      <h2>技术栈</h2>
      <p>Vue 3 · Vite · Vue Router 4 · Pinia · Three.js · GLTFLoader</p>
    </section>

    <section class="block">
      <h2>技术难点</h2>
      <ul class="hl">
        <li v-for="h in highlights" :key="h.t">
          <b>{{ h.t }}</b>
          <span>{{ h.d }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.block { margin-bottom: 34px; max-width: 760px; }
.block h2 { font-size: 17px; margin-bottom: 10px; }
.block p { color: var(--sub); font-size: 14.5px; }

.hl { list-style: none; padding: 0; margin: 0; }
.hl li {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
}
.hl b { display: block; font-size: 14.5px; margin-bottom: 5px; }
.hl span { color: var(--sub); font-size: 13.5px; }
</style>
