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
- `/day/YYYY-MM-DD` Registro diario
- `/admin/users` Gestión de usuarios e invitaciones

## Notas de implementación

- La creación de cuentas nuevas requiere invitación cuando ya existe al menos un usuario en la base de datos.
- Las invitaciones pueden enviarse por SMTP real. Si SMTP no está configurado, la app crea la invitación y copia el enlace para compartirlo manualmente.
- El archivo `.env` incluye una configuración local lista para SQLite.

## Configuración de email

Para que el panel admin envíe invitaciones reales por correo, configura estas variables en `.env`:

```bash
APP_BASE_URL="http://localhost:3000"
SMTP_HOST="smtp.tu-proveedor.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="usuario"
SMTP_PASS="contraseña"
MAIL_FROM="WellFlow <no-reply@tu-dominio.com>"
```

Cuando `SMTP_HOST`, `SMTP_USER` o `SMTP_PASS` faltan, la invitación se crea igualmente y el enlace queda disponible para copiar o reenviar desde `/admin/users`.

## Verificación

- `npm run lint`
- `npm run build`
