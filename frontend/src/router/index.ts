import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { canAccessRoute } from '@/shared/permissions'
import LoginView from '@/features/auth/ui/LoginView.vue'
import InicioView from '@/features/home/ui/InicioView.vue'
import ConfiguracionView from '@/features/configuration/ui/ConfiguracionView.vue'
import UsuariosView from '@/features/users/ui/UsuariosView.vue'
import UsuarioFormView from '@/features/users/ui/UsuarioFormView.vue'
import HotelFormView from '@/features/hotels/ui/HotelFormView.vue'
import HotelCalendarView from '@/features/sessions/ui/HotelCalendarView.vue'

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
      path: '/agenda',
      name: 'agenda',
      component: HotelCalendarView,
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
    {
      path: '/hoteles/nuevo',
      name: 'hotel-nuevo',
      component: HotelFormView,
      meta: { requiresAuth: true },
    },
    {
      path: '/hoteles/:id/editar',
      name: 'hotel-editar',
      component: HotelFormView,
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
  } else if (to.meta.requiresAuth && authStore.user) {
    // Comprobar permisos según la matriz de roles
    if (!canAccessRoute(authStore.user.roleCode, to.path)) {
      next('/inicio')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
