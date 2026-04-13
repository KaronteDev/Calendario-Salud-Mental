# WellFlow PHP + MySQL

Migracion base de la app a un stack compatible con hosting Linux de Arsys usando PHP, MySQL y Apache.

## Objetivo

Este paquete crea una base desplegable en Apache con:

- Auth local por sesiones PHP
- Login, signup con invitacion, logout
- Recuperacion de contrasena
- Dashboard mensual con calendario y resumen
- Analitica mensual con graficos interactivos
- Registro diario por fecha
- Panel admin basico para usuarios e invitaciones
- OAuth social configurable para Google, Facebook y LinkedIn
- Esquema MySQL equivalente al modelo principal de la app actual

## Estructura

- `public/` front controller y assets
- `database/schema.sql` esquema MySQL
- `database/seed.sql` datos de prueba para desarrollo
- `config.example.php` configuracion base original
- `config.php.example` plantilla compatible adicional
- `public/index.php` incluye router, auth, OAuth y dashboard
- `public/install.php` instalador web para MariaDB y datos demo
- `public/server-check.php` diagnostico minimo de PHP, DNS y MariaDB desde el propio hosting

## Despliegue en Arsys

1. Copia la carpeta `php-mysql` a tu hosting.
2. Duplica `config.php.example` como `config.php` y rellena credenciales MySQL.
3. Importa `database/schema.sql` en tu base MySQL.
4. Activa OAuth en `config.php` si vas a usar login social.
5. Configura el dominio o subdominio para que el document root apunte a `public/`.
6. Si no puedes apuntar a `public/`, mueve el contenido de `public/` a `public_html/` y ajusta rutas de `config.php`.

Si Apache devuelve `500` en rutas limpias como `/login` pero `/index.php/login` funciona, el problema esta en el rewrite. Sube tambien el `.htaccess` actualizado de `public/`, que reescribe a `index.php/ruta` para compatibilidad con hosting CGI/FastCGI como Arsys.

## Datos de prueba

Si quieres poblar la base con datos demo, importa tambien `database/seed.sql` despues de `schema.sql`.

Tambien puedes reconstruir toda la base demo automaticamente con este comando:

```bash
php scripts/reset_demo_data.php
```

El script:

- lee `config.php`
- elimina las tablas principales en orden seguro
- vuelve a ejecutar `database/schema.sql`
- vuelve a cargar `database/seed.sql`

Opciones utiles:

```bash
php scripts/reset_demo_data.php --fresh
php scripts/reset_demo_data.php --seed-only
php scripts/reset_demo_data.php --user=nuevo@wellflow.local
php scripts/reset_demo_data.php --user=admin-extra@wellflow.local --password=AdminTemporal123! --role=admin
php scripts/reset_demo_data.php --user=nuevo@wellflow.local --with-invitation
```

Comportamiento de cada opcion:

- `--fresh`: fuerza reconstruccion completa de tablas y datos
- `--seed-only`: conserva el schema actual y solo limpia/recarga los datos demo
- `--user=...`: crea un usuario adicional con password `Demo123!` despues del seed
- `--password=...`: cambia la password del usuario extra creado con `--user=...`
- `--role=admin|user`: asigna el rol del usuario extra creado con `--user=...`
- `--with-invitation`: crea tambien una invitacion asociada al usuario extra y la marca como aceptada

## Instalador web

La pagina `public/install.php` permite desde navegador:

- comprobar la conexion con MariaDB
- reconstruir `schema.sql` y `seed.sql`
- recargar solo el seed
- crear usuarios demo extra con rol, password e invitacion opcional
- editar y guardar la configuracion de conexion en `config.php`

Proteccion recomendada:

- configura `installer.token` en `config.php`
- abre la URL `/install.php?token=TU_TOKEN`
- si dejas vacia la password DB al guardar, se conserva la actual

## Debug de errores

Si la app o el instalador fallan durante el arranque, puedes forzar salida detallada con:

- `/login?debug=1&debug_token=TU_TOKEN_DEBUG`
- `/install.php?token=TU_TOKEN_INSTALL&debug=1&debug_token=TU_TOKEN_DEBUG`

Configuracion asociada en `config.php`:

- `debug.enabled`
- `debug.token`

Si el hosting sigue devolviendo 500 antes de renderizar la app, abre tambien `public/server-check.php` para validar:

- version real de PHP en el servidor
- extensiones `pdo`, `pdo_mysql` y `mysqli`
- lectura de `config.php`
- resolucion DNS del host MariaDB
- conexion PDO a MariaDB desde el propio servidor

Mientras corriges el rewrite, puedes abrir la app con rutas directas como `/index.php/login`.

Credenciales incluidas:

- `admin@wellflow.local` / `Admin123!`
- `ana@wellflow.local` / `Demo123!`
- `invitado@wellflow.local` / `Invitado123!`

Contenido del seed:

- 3 usuarios listos para login
- 2 cuentas sociales enlazadas de ejemplo
- 3 invitaciones, incluidas pendientes y aceptada
- 12 registros diarios para poblar calendario, resumen y graficos
- 1 token de reset de ejemplo: `reset-demo-token-2026`

## Requisitos

- PHP 8.1 o superior
- Extensiones PDO y pdo_mysql
- Apache con `mod_rewrite`

## Notas

- El paquete prioriza compatibilidad de hosting compartido: no depende de Node.js ni de procesos residentes.
- El envio de email usa `mail()` de PHP como base. Si en Arsys prefieres SMTP autenticado, conviene integrar PHPMailer en un siguiente paso.
- Los botones sociales usan rutas reales. Google, Facebook y LinkedIn estan listos para configurarse desde `config.php`.
- Instagram queda preparado a nivel de config y tabla, pero su flujo cambia segun el producto Meta habilitado y suele requerir una integracion especifica adicional.

## OAuth social

En `config.php` puedes activar proveedores asi:

```php
'oauth' => [
	'google' => [
		'enabled' => true,
		'client_id' => '...',
		'client_secret' => '...',
		'redirect_uri' => 'https://tu-dominio.com/oauth/callback?provider=google',
	],
]
```

Comportamiento:

- Si el email ya existe, WellFlow enlaza la cuenta social con ese usuario.
- Si no existe y es el primer usuario del sistema, crea la cuenta como admin.
- Si no existe y hay una invitacion pendiente para ese email, crea la cuenta con el rol de la invitacion.
- Si no existe y no hay invitacion, se bloquea el alta para mantener el aislamiento previsto.

## Siguiente paso recomendado

Pulir fidelidad visual del dashboard/admin respecto a la app publicada y completar el flujo SMTP autenticado para invitaciones y recuperacion.