import './assets/main.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import es from 'element-plus/es/locale/lang/es'
import dayjs from 'dayjs'
import localeData from 'dayjs/plugin/localeData'
import updateLocale from 'dayjs/plugin/updateLocale'
import esLocale from 'dayjs/locale/es'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

dayjs.extend(localeData)
dayjs.extend(updateLocale)
dayjs.locale('es', esLocale)

// Garantizar que la propiedad weekStart sea 1 (Lunes) en cualquier fecha evaluada por Element Plus
if (dayjs && dayjs.prototype && typeof dayjs.prototype.$locale === 'function') {
  const origLocale = dayjs.prototype.$locale
  dayjs.prototype.$locale = function (this: unknown) {
    const loc = origLocale.call(this) || {}
    return {
      ...loc,
      weekStart: 1,
    }
  }
}

import VueIosDatepicker from 'vue-ios-style-datepicker'
import 'vue-ios-style-datepicker/style.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, {
  locale: es,
})
app.use(VueIosDatepicker)

// Register all Element Plus icons globally
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
