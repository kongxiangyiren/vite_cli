module.exports = {
  appVue: `<template>
<!-- appVue -->
</template>

<script setup<!-- scriptlang --> >
</script>

<style scoped<!-- stylelang --> >
</style>`,
  main: `import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
<!-- mainImport -->
const app = createApp(App);
<!-- mainUse -->
app.mount('#app');
`,
  router: `import { createRouter, <!-- createWebHistory --><!-- RouteRecordRaw -->} from 'vue-router'
// import Home from '../views/HomeView.vue'
const routes<!-- routerTs --> = [
  // {
  //   path: '/',
  //   name: 'home',
  //   component: Home
  // },
  // {
  //   path: '/about',
  //   name: 'about',
  //   component: () => import( '../views/AboutView.vue')
  // }
]

const router = createRouter({
  history: <!-- createWebHistory -->(import.meta.env.BASE_URL),
  routes
})

export default router
    `,
  pinia: `import { defineStore } from 'pinia';

export const useMainStore = defineStore('main', {
  state: () => {
    return {};
  },
  getters: {},
  actions: {}
});
`,
  viteConfig: `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
<!-- viteConfigImport -->
<!-- viteUse -->
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()<!-- viteConfigPlugin -->]
  <!-- vitePlgin -->
})
    `
};
