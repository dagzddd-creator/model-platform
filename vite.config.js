import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // base: './' 让打包产物用相对路径，部署到 GitHub Pages 的子目录下也能正常加载
  base: './',
  server: {
    port: 5173,
    open: true,
  },
})
