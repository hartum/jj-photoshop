import { createRouter, createWebHistory } from 'vue-router'
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
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/inicio',
      name: 'inicio',
      component: InicioView,
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: ConfiguracionView,
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: UsuariosView,
    },
    {
      path: '/usuarios/nuevo',
      name: 'usuario-nuevo',
      component: UsuarioFormView,
    },
    {
      path: '/usuarios/:id/editar',
      name: 'usuario-editar',
      component: UsuarioFormView,
    },
  ],
})

export default router
