# Guía de Uso de Iconos Lucide (`@lucide/vue`)

Este documento detalla el estándar para el uso de la librería de iconos [Lucide Icons](https://lucide.dev) en el frontend del proyecto JJ Photoshop.

---

## 📦 Paquete Instalado
El paquete oficial para Vue 3 es:
```bash
@lucide/vue
```

Catálogo completo de iconos disponibles: [https://lucide.dev/icons](https://lucide.dev/icons)

---

## 🎨 Formas de Uso

### 1. Importación y Uso Básico
Importar el icono en PascalCase directamente desde `@lucide/vue`:

```vue
<script setup lang="ts">
import { Camera, Calendar, DollarSign, Settings, User } from '@lucide/vue'
</script>

<template>
  <!-- Renderizado con propiedades opcionales -->
  <Camera :size="24" color="#2563eb" :stroke-width="2" />
  
  <!-- Personalización con clases CSS -->
  <DollarSign class="text-success" />
</template>
```

### 2. Integración con Element Plus
Dado que los iconos de `@lucide/vue` son componentes Vue nativos, son compatibles directamente con botones y contenedores de Element Plus:

```vue
<script setup lang="ts">
import { Plus, Download, Calendar } from '@lucide/vue'
</script>

<template>
  <!-- En botones de Element Plus con la propiedad :icon -->
  <el-button type="primary" :icon="Plus">
    Nuevo Registro
  </el-button>

  <!-- Dentro de <el-icon> -->
  <el-icon :size="20" color="#10b981">
    <Calendar />
  </el-icon>
</template>
```

---

## ⚙️ Propiedades Principales de los Iconos

| Propiedad | Tipo | Valor por Defecto | Descripción |
|---|---|---|---|
| `size` | `number \| string` | `24` | Tamaño del icono en píxeles (ancho y alto). |
| `color` | `string` | `'currentColor'` | Color del trazo (hex, rgb, `currentColor`). |
| `stroke-width` | `number \| string` | `2` | Grosor del trazo SVG. |
| `absolute-stroke-width` | `boolean` | `false` | Mantiene el grosor constante independiente del tamaño. |
| `class` / `default-class` | `string` | `''` | Clases CSS a aplicar al elemento SVG. |

---

## 💡 Buenas Prácticas
1. **Consistencia de tamaño**: Usar preferentemente `:size="18"` o `:size="20"` para botones y tablas, y `:size="24"` o `:size="32"` para tarjetas/KPIs.
2. **Colores semánticos**: Utilizar `currentColor` para que el icono herede el color del texto del botón/enlace, o pasar variables CSS del tema.
