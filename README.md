# El Soundtrack de Monterrey

**Narrativa visual sobre la evolución de la música en Nuevo León**

Una visualización de datos interactiva que explora cómo la identidad sonora de Nuevo León ha evolucionado a través del tiempo y la geografía.

## Datos

Este proyecto utiliza datos de [Monterrey Music Lab](https://monterreymusiclab.org):
- **11,000+** lanzamientos musicales documentados
- **1,185** artistas de Nuevo León
- Desde **1961** hasta el presente

## Características

- **Visualización temporal**: Gráfico de áreas apiladas mostrando la evolución de géneros musicales
- **Narrativa scrollytelling**: Secciones interactivas que cuentan la historia de cada era musical
- **Datos geográficos**: Distribución de artistas por municipio

## Eras Musicales

1. **Los Orígenes** (1950-1979): Norteño y las raíces
2. **Rock Regio** (1980-1999): La capital del rock en español
3. **Diversificación** (2000-2015): Electrónica, indie y experimentación
4. **Era Urbana** (2016-presente): Rap y reggaetón

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/jrehlaender91/narrativa-musical-nl.git
cd narrativa-musical-nl

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar servidor de desarrollo
npm run dev
```

## Variables de Entorno

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Tech Stack

- **React 19** + **Vite**
- **Recharts** para visualizaciones
- **Tailwind CSS** para estilos
- **Supabase** como backend

## Créditos

Proyecto desarrollado para el curso de Visualización de Datos.

Datos proporcionados por [Monterrey Music Lab](https://monterreymusiclab.org).

## Licencia

MIT
