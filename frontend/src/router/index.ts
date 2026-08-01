import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import InicioView from '@/views/InicioView.vue'
import ConfiguracionView from '@/views/ConfiguracionView.vue'
import UsuariosView from '@/views/UsuariosView.vue'
import UsuarioFormView from '@/views/UsuarioFormView.vue'
import LoginView from '@/views/LoginView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/inicio',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/inicio',
      name: 'inicio',
      component: InicioView,
      meta: { requiresAuth: true },
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: ConfiguracionView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios/nuevo',
      name: 'usuario-nuevo',
      component: UsuarioFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/usuarios/:id/editar',
      name: 'usuario-editar',
      component: UsuarioFormView,
      meta: { requiresAuth: true },
    },
  ],
})

// Guards de navegación del router
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // Si no está registrado/autenticado, redirige al login
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    // Si ya está autenticado e intenta ir a /login, redirige por defecto a /inicio
    next('/inicio')
  } else {
    next()
  }
})

export default router
