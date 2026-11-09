<script setup>
/**
 * ⭐ 这是整个项目最核心、也最难的文件：把 Three.js 封装成一个 Vue 组件。
 *
 * 三个真实的坑（也是面试最能讲的点）：
 *   1. Vue 的响应式代理会和 Three.js 的对象引用机制冲突
 *      → 用 markRaw / shallowRef 存放 Three.js 对象
 *   2. 组件卸载不会自动释放 WebGL 资源（显存泄漏）
 *      → 手动 dispose 几何体、材质、渲染器
 *   3. 容器尺寸变化不能只监听 window.resize
 *      → 用 ResizeObserver 监听容器本身
 */
import { ref, shallowRef, onMounted, onBeforeUnmount, watch, markRaw } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const props = defineProps({
  /** 模型地址（.glb）。留空则显示程序化生成的占位建筑 */
  modelUrl: { type: String, default: '' },
  /** 程序化建筑的参数：{ floors, floorHeight, width, depth, winPerFace } */
  params: { type: Object, default: () => ({}) },
  /** 线框模式 */
  wireframe: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'loaded', 'error', 'progress'])

const el = ref(null)
const status = ref('loading')     // loading | ready | error
const progress = ref(0)
const errorMsg = ref('')

/** ⭐ shallowRef：只追踪 .value 的替换，不深度代理内部对象
 *  markRaw：明确告诉 Vue「不要代理这个对象」 */
const ctx = shallowRef(null)

let rafId = 0
let helper = null

/* ═══════════════════════════════════════════════
   程序化生成一栋楼（没有 .glb 时的兜底方案）
   ═══════════════════════════════════════════════ */
function buildProcedural(p = {}) {
  const {
    floors = 8, floorHeight = 3, width = 10, depth = 8,
    winPerFace = 4, winW = 1.6, winH = 1.5,
  } = p

  const group = new THREE.Group()
  group.name = '程序化建筑'
  const H = floors * floorHeight

  const matWall = new THREE.MeshStandardMaterial({ color: 0xb6bcc6, roughness: 0.85 })
  const matEq   = new THREE.MeshStandardMaterial({ color: 0x8f959e, roughness: 0.7, metalness: 0.3 })
  const matWin  = new THREE.MeshStandardMaterial({
    color: 0x1d2a38, roughness: 0.15, metalness: 0.7,
    emissive: 0x66aaff, emissiveIntensity: 0.25,
  })

  // 主体
  const core = new THREE.Mesh(new THREE.BoxGeometry(width, H, depth), matWall)
  core.position.y = H / 2
  core.castShadow = true
  core.receiveShadow = true
  core.name = '建筑主体'
  core.userData = { type: '建筑主体', floor: `1-${floors}F` }
  group.add(core)

  // 窗户：两层循环在四个立面生成（参数化）
  const winGeo = new THREE.BoxGeometry(winW, winH, 0.12)
  const usableW = width - 2
  const usableD = depth - 2
  const gapX = usableW / winPerFace
  const gapZ = usableD / winPerFace

  for (let f = 0; f < floors; f++) {
    const y = f * floorHeight + floorHeight * 0.52
    for (let i = 0; i < winPerFace; i++) {
      const x = -usableW / 2 + gapX * (i + 0.5)
      for (const z of [depth / 2 + 0.02, -depth / 2 - 0.02]) {
        const w = new THREE.Mesh(winGeo, matWin)
        w.position.set(x, y, z)
        w.castShadow = w.receiveShadow = true
        w.name = `外窗_${f + 1}F_${i + 1}`
        w.userData = { type: '外窗', floor: `${f + 1}F` }
        group.add(w)
      }
      const z2 = -usableD / 2 + gapZ * (i + 0.5)
      for (const xx of [width / 2 + 0.02, -width / 2 - 0.02]) {
        const w = new THREE.Mesh(winGeo, matWin)
        w.position.set(xx, y, z2)
        w.rotation.y = Math.PI / 2
        w.castShadow = w.receiveShadow = true
        w.name = `外窗_${f + 1}F_${i + 1}`
        w.userData = { type: '外窗', floor: `${f + 1}F` }
        group.add(w)
      }
    }
  }

  // 女儿墙
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.4, 1.0, depth + 0.4), matWall
  )
  parapet.position.y = H + 0.5
  parapet.castShadow = true
  parapet.name = '女儿墙'
  parapet.userData = { type: '女儿墙', floor: '屋面' }
  group.add(parapet)

  // 屋顶设备
  const roofItems = [
    { w: 2.4, h: 1.8, d: 2.4, x: -2.6, z: -1.8, label: '屋顶水箱' },
    { w: 3.0, h: 1.4, d: 2.0, x:  2.4, z:  1.6, label: '空调机组' },
    { w: 2.0, h: 2.6, d: 2.0, x:  0.0, z: -3.0, label: '楼梯间' },
  ]
  roofItems.forEach((it) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(it.w, it.h, it.d), matEq)
    m.position.set(it.x, H + 1 + it.h / 2, it.z)
    m.castShadow = m.receiveShadow = true
    m.name = it.label
    m.userData = { type: it.label, floor: '屋面' }
    group.add(m)
  })

  return group
}

/* ═══════════════════════════════════════════════
   工具：清空一个 Group，并释放它占用的显存
   ⚠️ 只把对象从场景里移除，几何体和材质还留在显存里 —— 必须 dispose
   ═══════════════════════════════════════════════ */
function clearGroup(group) {
  group.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose()
      const mat = o.material
      if (Array.isArray(mat)) mat.forEach((m) => m?.dispose())
      else mat?.dispose()
    }
  })
  group.clear()
}

function clearHelper() {
  const c = ctx.value
  if (!c || !helper) return
  c.modelRoot.remove(helper)
  helper.geometry?.dispose()
  helper.material?.dispose()
  helper = null
}

function applyWireframe() {
  const c = ctx.value
  if (!c) return
  c.modelRoot.traverse((o) => {
    if (!o.isMesh) return
    const mat = o.material
    if (Array.isArray(mat)) mat.forEach((m) => { if (m) m.wireframe = props.wireframe })
    else if (mat) mat.wireframe = props.wireframe
  })
}

/* ═══════════════════════════════════════════════
   初始化场景
   ═══════════════════════════════════════════════ */
function init() {
  const host = el.value
  if (!host) return

  const width = host.clientWidth || 800
  const height = host.clientHeight || 520

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0e1116)
  scene.fog = new THREE.Fog(0x0e1116, 70, 240)

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  camera.position.set(28, 24, 34)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  host.appendChild(renderer.domElement)

  // 光照
  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x2a2f38, 1.1))
  const sun = new THREE.DirectionalLight(0xffffff, 2.4)
  sun.position.set(32, 48, 26)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -70
  sun.shadow.camera.right = 70
  sun.shadow.camera.top = 70
  sun.shadow.camera.bottom = -70
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 240
  sun.shadow.bias = -0.0005
  scene.add(sun)

  // 地面 + 网格
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x1a1e25, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(600, 300, 0x2a3240, 0x1c222b)
  grid.position.y = 0.01
  scene.add(grid)

  // 相机控制
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI / 2.05
  controls.minDistance = 8
  controls.maxDistance = 260

  // 模型挂在这里（每次切换模型只清空这个 Group，不动场景）
  const modelRoot = new THREE.Group()
  scene.add(modelRoot)

  // 渲染循环
  function animate() {
    rafId = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  // ⭐ 用 ResizeObserver 监听「容器」尺寸，而不是 window
  const ro = new ResizeObserver(() => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  ro.observe(host)

  // ⭐ 点击拾取（Raycaster）
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  function onPointerDown(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    // 屏幕坐标 → 标准化设备坐标（-1 ~ 1）
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(modelRoot, true)   // true = 递归子对象

    clearHelper()

    if (!hits.length) {
      emit('select', null)
      return
    }

    const obj = hits[0].object
    helper = new THREE.BoxHelper(obj, 0x66ccff)
    modelRoot.add(helper)
    emit('select', obj)
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  ctx.value = markRaw({
    scene, camera, renderer, controls, modelRoot, ro, onPointerDown,
  })

  loadModel()
}

/* ═══════════════════════════════════════════════
   加载模型：有 url 用 GLTFLoader，没有就用程序化建筑
   ═══════════════════════════════════════════════ */
function loadModel() {
  const c = ctx.value
  if (!c) return

  clearHelper()
  clearGroup(c.modelRoot)
  status.value = 'loading'
  progress.value = 0
  errorMsg.value = ''
  emit('select', null)

  const url = props.modelUrl

  // 没有模型文件 → 程序化生成（保证项目开箱即跑）
  if (!url) {
    c.modelRoot.add(buildProcedural(props.params))
    applyWireframe()
    status.value = 'ready'
    emit('loaded')
    return
  }

  new GLTFLoader().load(
    url,
    (gltf) => {
      const model = gltf.scene

      model.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = true
        o.receiveShadow = true
        o.userData = { type: o.name || '构件', floor: '—' }
      })

      // 自动适配：居中 → 缩放到 30 单位内 → 落到地面
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      const s = 30 / maxDim

      model.scale.setScalar(s)
      model.position.set(-center.x * s, -center.y * s, -center.z * s)

      const box2 = new THREE.Box3().setFromObject(model)
      model.position.y -= box2.min.y

      c.modelRoot.add(model)
      applyWireframe()
      status.value = 'ready'
      emit('loaded')
    },
    (xhr) => {
      if (xhr.total) {
        progress.value = Math.round((xhr.loaded / xhr.total) * 100)
        emit('progress', progress.value)
      }
    },
    (err) => {
      // ⚠️ 加载失败要给出可见反馈，而不是白屏
      status.value = 'error'
      errorMsg.value = '模型加载失败，已显示占位建筑'
      emit('error', err)
      c.modelRoot.add(buildProcedural(props.params))
      applyWireframe()
    }
  )
}

/* ═══════════════════════════════════════════════
   生命周期
   ═══════════════════════════════════════════════ */
onMounted(init)

onBeforeUnmount(() => {
  const c = ctx.value
  if (!c) return

  cancelAnimationFrame(rafId)
  c.ro.disconnect()
  c.renderer.domElement.removeEventListener('pointerdown', c.onPointerDown)

  clearHelper()
  clearGroup(c.modelRoot)

  c.controls.dispose()
  c.renderer.dispose()                        // 释放 WebGL 上下文
  c.renderer.domElement.remove()              // 从 DOM 里移除 canvas

  ctx.value = null
})

// 切换模型 / 参数变化 → 重新加载
watch(() => props.modelUrl, loadModel)
watch(() => props.params, loadModel, { deep: true })
watch(() => props.wireframe, applyWireframe)
</script>

<template>
  <div class="viewer">
    <div ref="el" class="canvas-host"></div>

    <div v-if="status === 'loading'" class="overlay">
      <div class="spinner"></div>
      <p class="overlay-text">模型加载中{{ progress ? ' ' + progress + '%' : '…' }}</p>
    </div>

    <div v-else-if="status === 'error'" class="overlay">
      <p class="overlay-text">⚠️ {{ errorMsg }}</p>
    </div>

    <slot />
  </div>
</template>

<style scoped>
.viewer {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 11;
  min-height: 420px;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: #0e1116;
}
.canvas-host { position: absolute; inset: 0; }
.canvas-host :deep(canvas) { display: block; }

.overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: rgba(14, 17, 22, .7);
  pointer-events: none;
}
.overlay-text { color: var(--sub); font-size: 14px; margin: 0; }

.spinner {
  width: 30px; height: 30px; margin-bottom: 14px;
  border: 3px solid var(--line); border-top-color: var(--blue);
  border-radius: 50%; animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
