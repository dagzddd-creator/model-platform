# 三维模型资产平台

基于 **Vue 3 + Vite + Three.js** 的三维模型浏览与检查平台。

🔗 **在线预览**：[部署后填入]

---

## 它"完整"在哪里

| 要素 | 本项目 |
|---|---|
| **路由** | ✅ 列表 / 详情 / 关于 / 404，含懒加载与 hash 模式 |
| **数据层** | ✅ JSON 数据源，字段化建模（下一阶段抽成 `services/modelApi.js` 模拟网络延迟） |
| **状态管理** | ✅ Pinia 已接入（收藏功能见「待完成」） |
| **完整流程** | ✅ 列表 → 筛选 → 进入详情 → 三维查看 → 点击构件看属性 |
| **部署** | ⏳ 待做（Vercel / GitHub Pages） |

---

## 跑起来

```bash
# 1. 把整个 model-platform 文件夹复制到你自己的目录（例如 D:\model-platform）
# 2. 安装依赖
npm install

# 3. 启动
npm run dev
```

浏览器会自动打开 `http://localhost:5173`。

**不需要任何模型文件**——没有 `.glb` 时，组件会用代码程序化生成一栋楼作为占位。

---

## 项目结构

```
model-platform/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js                    # 入口：挂载 Pinia 和 Router
    ├── style.css                  # 全局样式
    ├── App.vue                    # 顶栏 + 路由出口
    ├── router/index.js            # 路由表（懒加载 + hash 模式）
    ├── data/models.json           # 模型数据（本地数据源）
    ├── components/
    │   └── ThreeViewer.vue        # ⭐ 核心：Three.js 封装成的 Vue 组件
    └── views/
        ├── ModelList.vue          # 列表页：筛选 + 搜索
        ├── ModelDetail.vue        # 详情页：三维查看器 + 属性面板
        ├── AboutView.vue          # 关于页：技术难点说明
        └── NotFoundView.vue       # 404
```

---

## ⭐ 技术难点（面试最有话说的部分）

全部集中在 `src/components/ThreeViewer.vue`：

### 1. Vue 的响应式会破坏 Three.js
Vue 3 用 `Proxy` 包装对象，而 Three.js 内部大量用 **引用相等（`===`）** 判断是否需要更新。
对象被代理后引用不再相等，会导致性能下降甚至渲染异常。

**解决**：用 `markRaw()` / `shallowRef()` 存放 Three.js 对象。

### 2. 组件卸载不等于资源释放
只把 canvas 从 DOM 移除，**WebGL 上下文、几何体、贴图仍然占着显存**。
来回切换模型几次就会爆。

**解决**：在 `onBeforeUnmount` 里 `dispose()` 几何体、材质、控制器、渲染器。

### 3. 尺寸监听要用 `ResizeObserver`
监听 `window.resize` 在布局变化（侧边栏展开、分栏拖动）时不会触发。

**解决**：`ResizeObserver` 监听**容器本身**。

### 4. 模型自动适配
不同来源的模型尺寸差异巨大（有的单位是 m，有的是 cm）。
加载后用 `Box3` 算包围盒，自动居中、缩放到统一尺寸、并落到地面 `y = 0`。

### 5. 点击拾取（Raycaster）
```
鼠标屏幕坐标 → 标准化设备坐标(-1~1) → 从相机发射射线 → 与模型求交 → 拿到构件
```

---

## 待完成（你要自己做的部分）

> ⚠️ 这个脚手架只是起点。**下面这些必须由你完成，项目才真正属于你。**

- [ ] **把 5 个程序化模型的参数调成不同的形态**（现在只是层数不同）
- [ ] **导出一栋真实的建筑模型**（3ds Max → FBX → Blender → `.glb`），放进 `public/models/`，
      并把 `models.json` 里对应的 `url` 填上
- [ ] **抽离数据层**：新建 `src/services/modelApi.js`，用 `Promise` + `setTimeout` 模拟延迟，
      页面加上**加载态 / 错误态 / 空态**
- [ ] **收藏功能**：新建 `src/stores/favorites.js`（Pinia），用 `localStorage` 持久化
- [ ] **最近查看记录**：详情页记录访问历史
- [ ] **键盘可访问性**：列表卡片支持 Tab 聚焦，Three.js 画布支持键盘旋转视角
- [ ] **性能**：多个模型时加 `DRACOLoader` 压缩几何体、`KTX2Loader` 压缩贴图
- [ ] **部署上线**（Vercel 或 GitHub Pages），把链接填到本文件第一行
- [ ] **截图**：把截图放进 `docs/` 并在 README 里展示

---

## 关于模型资产（重要）

- ✅ **只用自己建的模型**，或明确开源许可的公开模型
- ❌ **不要用公司项目里的资产**（涉密）
- 推荐格式：`.glb`（单文件、体积小、加载快）

导出链路：`3ds Max → 导出 FBX → Blender 转 glTF/GLB`

---

## 技术栈

Vue 3 · Vite · Vue Router 4 · Pinia · Three.js · GLTFLoader · 原生 CSS
