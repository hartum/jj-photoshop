import { createRouter, createWebHistory } from 'vue-router'
import UsersView from '@features/users/ui/UsersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'users',
      component: UsersView,
    },
  ],
})

export default router
