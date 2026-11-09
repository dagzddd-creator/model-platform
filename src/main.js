import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())   // 状态管理（收藏、最近查看）
app.use(router)
app.mount('#app')
