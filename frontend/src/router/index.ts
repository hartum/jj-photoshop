import { createRouter, createWebHistory } from 'vue-router'
import InicioView from '@/views/InicioView.vue'
import ConfiguracionView from '@/views/ConfiguracionView.vue'
import UsuariosView from '@/views/UsuariosView.vue'
import UsuarioFormView from '@/views/UsuarioFormView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/inicio',
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
