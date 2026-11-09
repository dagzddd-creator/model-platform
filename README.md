# 三维模型资产平台

基于 Vue 3 + Vite + Three.js 的三维模型浏览与检查工具。

在线预览：https://dagzddd-creator.github.io/model-platform/

## 功能

- **模型列表**：分类筛选 + 关键词搜索，卡片式网格布局
- **三维预览**：Three.js 渲染，支持轨道控制（左键旋转 / 滚轮缩放 / 右键平移）、方向光与阴影
- **构件拾取**：点击模型构件自动描边高亮，右侧面板显示构件名称、类型与所属楼层
- **模型自动适配**：不同来源、不同单位的模型自动居中、等比缩放到统一尺寸并落至地面
- **占位模型**：未提供 `.glb` 文件时用代码程序化生成建筑，项目开箱即可运行
- **响应式布局**：窄屏下自动切换为单列

## 技术栈

| 分类 | 内容 |
|---|---|
| 框架 | Vue 3（`<script setup>` 组合式 API） |
| 构建 | Vite |
| 路由 | Vue Router 4（路由懒加载 + hash 模式） |
| 状态 | Pinia |
| 三维 | Three.js、GLTFLoader |
| 样式 | 原生 CSS（scoped） |

## 快速开始

```bash
git clone https://github.com/dagzddd-creator/model-platform.git
cd model-platform
npm install
npm run dev
```

浏览器打开 http://localhost:5173

构建生产版本：

```bash
npm run build
npm run preview
```

## 项目结构

```
model-platform/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js                    # 入口：挂载 Pinia 与 Router
    ├── style.css                  # 全局样式
    ├── App.vue                    # 顶栏 + 路由出口
    ├── router/index.js            # 路由表（懒加载 + hash 模式）
    ├── data/models.json           # 模型数据
    ├── components/
    │   └── ThreeViewer.vue        # Three.js 封装成的 Vue 组件
    └── views/
        ├── ModelList.vue          # 列表页：筛选 + 搜索
        ├── ModelDetail.vue        # 详情页：三维查看器 + 属性面板
        ├── AboutView.vue          # 关于页
        └── NotFoundView.vue       # 404
```

## 实现要点

### 1. Vue 的响应式会干扰 Three.js

Vue 3 用 `Proxy` 包装响应式对象，而 Three.js 内部大量依赖对象引用相等（`===`）来判断是否需要更新。
对象被代理后引用不再相等，会导致性能下降甚至渲染异常。

因此 Three.js 的对象不放进 `reactive()`，改用 `shallowRef()` 存放，并用 `markRaw()` 标记：

```js
ctx.value = markRaw({ scene, camera, renderer, controls, modelRoot })
```

### 2. 组件卸载时需要手动释放资源

仅把 canvas 从 DOM 中移除，WebGL 上下文、几何体和贴图仍然占用显存，反复挂载卸载会持续泄漏。

在 `onBeforeUnmount` 中逐个释放：

```js
cancelAnimationFrame(rafId)
ro.disconnect()
clearGroup(modelRoot)      // 遍历 dispose 几何体与材质
controls.dispose()
renderer.dispose()
```

### 3. 尺寸监听用 ResizeObserver

监听 `window.resize` 只在窗口尺寸变化时触发，容器因布局变化而改变尺寸时不会响应。
改用 `ResizeObserver` 监听容器本身。

### 4. 模型自动适配

不同来源的模型单位可能是 m 或 cm，尺寸差异很大。加载后计算包围盒，按最大边缩放到统一尺寸，
再根据包围盒的中心与最低点做位移，保证居中且贴近地面：

```js
const box = new THREE.Box3().setFromObject(model)
const maxDim = Math.max(size.x, size.y, size.z) || 1
const s = 30 / maxDim
```

### 5. 点击拾取

```
屏幕坐标 → 标准化设备坐标（-1 ~ 1）→ 从相机发射射线 → 与模型求交 → 取最近构件
```

命中的构件用 `BoxHelper` 描边高亮，并通过组件事件把构件信息抛给父组件。

## 后续计划

- [ ] 接入真实建筑模型（3ds Max → FBX → Blender → `.glb`）
- [ ] 数据层抽离到 `services/modelApi.js`，补充加载态与错误态
- [ ] 收藏功能（Pinia + localStorage 持久化）
- [ ] 模型压缩：Draco 压缩几何体、KTX2 压缩贴图
- [ ] 补充单元测试

## 模型资源

- 统一使用 `.glb` 格式（单文件、体积小、加载快）
- 仓库内置的程序化建筑仅用于演示，接入真实模型后替换
- 导出链路：`3ds Max → FBX → Blender → glTF/GLB`

## License

MIT
