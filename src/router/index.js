import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由表
 *
 * 用 createWebHashHistory（hash 模式）而不是 createWebHistory：
 *   · hash 模式地址形如 /#/model/office-a，刷新和直接访问都不会 404
 *   · history 模式需要服务端把所有未匹配路径回退到 index.html
 *     （部署到 GitHub Pages 时就得额外配 404.html 或改 nginx 规则）
 *
 * 组件用 () => import(...) 动态导入 → 每个页面单独打包，
 * 首屏只加载列表页，点进详情才去下载详情页的代码（路由懒加载）。
 */
const routes = [
  {
    path: '/',
    name: 'model-list',
    component: () => import('../views/ModelList.vue'),
    meta: { title: '模型列表' },
  },
  {
    path: '/model/:id',
    name: 'model-detail',
    component: () => import('../views/ModelDetail.vue'),
    props: true,                       // 把路由参数 id 作为 props 传给组件
    meta: { title: '模型详情' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: { title: '关于' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} · 三维模型资产平台`
    : '三维模型资产平台'
})

export default router
