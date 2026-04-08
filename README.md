# WellFlow

Reconstrucción de una aplicación de seguimiento de bienestar personal con calendario mensual, registro diario, analítica mensual, idiomas, tema oscuro/claro y panel de administración.

## Stack

- Next.js 16 con App Router y TypeScript
- Prisma + SQLite para persistencia local
- Recharts para gráficos mensuales
- Autenticación local con cookie de sesión firmada

## Funcionalidades incluidas

- Dashboard con calendario mensual, navegación entre meses y resumen visual por día
- Vista rápida del día desde el calendario
- Registro diario con valoraciones 1-5, horas de sueño, objetivos y notas
- Resumen mensual con promedios y porcentajes de cumplimiento
- Pestañas de gráficos: tendencias, sueño, perfil y objetivos
- Selector de idioma: español, inglés, francés y ruso
- Tema claro/oscuro persistido en navegador y sincronizado con usuario
- Aislamiento de datos por usuario
- Panel de administración en `/admin/users` para cambiar roles e invitar usuarios
- Accesos sociales configurables para Google, Facebook, Instagram y LinkedIn
- Recuperación de contraseña por email o enlace local de desarrollo

## Puesta en marcha

1. Instala dependencias.

```bash
npm install
```

2. Crea la base de datos local.

```bash
npm run db:push
```

3. Carga usuarios y datos demo.

```bash
npm run db:seed
```

4. Arranca en desarrollo.

```bash
npm run dev
```

## Credenciales demo

- Admin: `admin@wellflow.local` / `Admin123!`
- Usuario demo: `demo@wellflow.local` / `Demo123!`

## Rutas principales

- `/` Dashboard autenticado
- `/login` Inicio de sesión
- `/signup` Alta mediante invitación
- `/forgot-password` Solicitud de recuperación de contraseña
- `/reset-password?token=...` Cambio de contraseña mediante token
- `/day/YYYY-MM-DD` Registro diario
- `/admin/users` Gestión de usuarios e invitaciones

## Notas de implementación

- La creación de cuentas nuevas requiere invitación cuando ya existe al menos un usuario en la base de datos.
- Las invitaciones pueden enviarse por SMTP real. Si SMTP no está configurado, la app crea la invitación y copia el enlace para compartirlo manualmente.
- El archivo `.env` incluye una configuración local lista para SQLite.

## Configuración de email

Para que el panel admin envíe invitaciones reales por correo, configura estas variables en `.env`:

```bash
APP_BASE_URL="http://localhost:3001"
SMTP_HOST="smtp.tu-proveedor.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="usuario"
SMTP_PASS="contraseña"
MAIL_FROM="WellFlow <no-reply@tu-dominio.com>"
```

Cuando `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS` faltan, la invitación se crea igualmente y el enlace queda disponible para copiar o reenviar desde `/admin/users`.
La recuperación de contraseña usa el mismo SMTP; si no está configurado, la app genera un enlace local para continuar en desarrollo.

## Configuración de acceso social

Puedes activar los botones de acceso social configurando los credenciales OAuth y usando `APP_BASE_URL` con la URL exacta de tu app:

```bash
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""
INSTAGRAM_CLIENT_ID=""
INSTAGRAM_CLIENT_SECRET=""
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
```

Si falta la configuración de un proveedor, el botón seguirá mostrándose en login pero redirigirá con un aviso indicando que ese acceso todavía no está configurado.

### Redirect URIs

Registra estas URLs de callback en cada proveedor, cambiando el dominio si despliegas fuera de local:

```bash
Google    -> http://localhost:3001/api/auth/oauth/google/callback
Facebook  -> http://localhost:3001/api/auth/oauth/facebook/callback
Instagram -> http://localhost:3001/api/auth/oauth/instagram/callback
LinkedIn  -> http://localhost:3001/api/auth/oauth/linkedin/callback
```

### Guía rápida por proveedor

Google:
`Google Cloud Console` → `APIs & Services` → `Credentials` → crea `OAuth client ID` tipo `Web application`. Añade el callback de Google y pon el `Authorized JavaScript origin` en `http://localhost:3001`.

Facebook:
`Meta for Developers` → crea una app → añade `Facebook Login for Business` o `Facebook Login` → en `Valid OAuth Redirect URIs` pega el callback de Facebook.

Instagram:
Usa `Meta for Developers` con producto `Instagram Basic Display` o el flujo que tengas habilitado. Debes registrar el callback de Instagram y verificar que la app permite ese redirect exacto.

LinkedIn:
`LinkedIn Developer Portal` → crea app → `Auth` → añade el callback de LinkedIn en `Authorized redirect URLs for your app`.

### Notas prácticas

- Google, Facebook y LinkedIn pueden devolver email. El flujo lo usa para enlazar invitaciones y cuentas existentes.
- Instagram normalmente no devuelve email en este flujo. Si no existe un usuario enlazado previamente, la app exigirá invitación y no podrá completar alta automática solo con Instagram.
- Si ya existe un usuario con el mismo email, el primer acceso social lo vincula a esa cuenta automáticamente.
- Si no existe usuario y no es el primer usuario del sistema, la app exige una invitación pendiente para ese email.

## Verificación

- `npm run lint`
- `npm run build`
