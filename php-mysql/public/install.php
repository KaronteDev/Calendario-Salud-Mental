<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$configFile = $root . DIRECTORY_SEPARATOR . 'config.php';

if (!file_exists($configFile)) {
    http_response_code(500);
    echo 'Falta php-mysql/config.php. Duplica config.example.php y completa la configuracion.';
    exit;
}

$config = require $configFile;
$config = installer_normalize_config($config);

installer_configure_runtime_debug($config);
register_shutdown_function(static function () use ($config): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        installer_render_fatal_error($error, $config);
    }
});

session_name($config['app']['session_name'] ?? 'wellflow_php_session');
session_start();

date_default_timezone_set('Europe/Madrid');

$installerEnabled = !array_key_exists('installer', $config) || (bool) ($config['installer']['enabled'] ?? true);
if (!$installerEnabled) {
    http_response_code(404);
    echo 'La pagina de instalacion esta desactivada.';
    exit;
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$token = installer_request_token();

if ($method === 'POST' && !installer_verify_csrf((string) ($_POST['csrf'] ?? ''))) {
    installer_flash('error', 'Sesion invalida. Recarga la pagina e intentalo de nuevo.');
    installer_redirect($token);
}

$pdo = null;
$pdoError = null;

try {
    $pdo = installer_create_pdo($config['database'] ?? []);
} catch (Throwable $exception) {
    $pdoError = $exception->getMessage();
}

if ($method === 'POST') {
    if (!installer_is_authorized($config, $token)) {
        installer_flash('error', 'Token de instalacion invalido.');
        installer_redirect('');
    }

    $action = trim((string) ($_POST['install_action'] ?? ''));

    try {
        if ($action === 'test_connection') {
            if ($pdo === null) {
                throw new RuntimeException('No se pudo conectar a MariaDB: ' . ($pdoError ?? 'Error desconocido.'));
            }

            installer_flash('success', 'Conexion MariaDB correcta. Servidor: ' . installer_database_version($pdo));
        } elseif ($action === 'fresh') {
            if ($pdo === null) {
                throw new RuntimeException('No hay conexion disponible con MariaDB.');
            }

            installer_run_fresh($pdo, $root);
            installer_flash('success', 'Base reconstruida: schema.sql y seed.sql ejecutados correctamente.');
        } elseif ($action === 'seed_only') {
            if ($pdo === null) {
                throw new RuntimeException('No hay conexion disponible con MariaDB.');
            }

            installer_run_seed_only($pdo, $root);
            installer_flash('success', 'Datos demo recargados correctamente sobre el schema actual.');
        } elseif ($action === 'create_user') {
            if ($pdo === null) {
                throw new RuntimeException('No hay conexion disponible con MariaDB.');
            }

            $email = strtolower(trim((string) ($_POST['email'] ?? '')));
            $password = (string) ($_POST['password'] ?? 'Demo123!');
            $role = (string) ($_POST['role'] ?? 'user');
            $withInvitation = !empty($_POST['with_invitation']);

            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('Introduce un email valido para el usuario extra.');
            }

            if ($password === '') {
                throw new InvalidArgumentException('La password del usuario extra no puede estar vacia.');
            }

            if (!in_array($role, ['admin', 'user'], true)) {
                throw new InvalidArgumentException('El rol del usuario extra debe ser admin o user.');
            }

            $extraUser = installer_create_extra_demo_user($pdo, $email, $password, $role);
            $message = 'Usuario creado: ' . $extraUser['email'] . ' (' . $extraUser['role'] . ').';

            if ($withInvitation) {
                $invitation = installer_create_extra_user_invitation($pdo, $email, $role);
                $message .= ' Invitacion aceptada creada con token ' . $invitation['token'] . '.';
            }

            installer_flash('success', $message);
        } elseif ($action === 'save_connection_config') {
            $updatedConfig = installer_build_updated_config($config, $_POST);
            installer_save_config_file($configFile, $updatedConfig);
            installer_flash('success', 'Configuracion guardada en config.php. Recarga la pagina y prueba la conexion MariaDB.');
        } else {
            throw new InvalidArgumentException('Accion de instalacion no valida.');
        }
    } catch (Throwable $exception) {
        installer_flash('error', $exception->getMessage());
    }

    installer_redirect($token);
}

$stats = $pdo ? installer_database_stats($pdo) : [];
$version = $pdo ? installer_database_version($pdo) : null;
$authorized = installer_is_authorized($config, $token);
$errorMessages = installer_pull_flash('error');
$successMessages = installer_pull_flash('success');

echo installer_render_page($config, $token, $authorized, $pdo !== null, $pdoError, $version, $stats, $errorMessages, $successMessages);

function installer_configure_runtime_debug(array $config): void
{
    $enabled = installer_debug_enabled($config);
    ini_set('display_errors', $enabled ? '1' : '0');
    ini_set('display_startup_errors', $enabled ? '1' : '0');
    error_reporting(E_ALL);
}

function installer_debug_enabled(array $config): bool
{
    $configured = (bool) ($config['debug']['enabled'] ?? false);
    $requested = (string) ($_GET['debug'] ?? '0') === '1';
    $tokenExpected = trim((string) ($config['debug']['token'] ?? ''));
    $provided = trim((string) ($_GET['debug_token'] ?? $_POST['debug_token'] ?? ''));

    if (!$configured && !$requested) {
        return false;
    }

    if ($tokenExpected === '') {
        return true;
    }

    return $provided !== '' && hash_equals($tokenExpected, $provided);
}

function installer_render_fatal_error($error, array $config): void
{
    if (headers_sent() === false) {
        http_response_code(500);
    }

    $debug = installer_debug_enabled($config);
    $message = $debug ? (string) ($error['message'] ?? 'Error interno') : 'La pagina de instalacion ha fallado durante el arranque.';
    $details = (string) (($error['file'] ?? '') . ':' . ($error['line'] ?? ''));

    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Error instalador | WellFlow</title><link rel="stylesheet" href="/assets/app.css"></head><body><div class="page-shell"><div class="shell"><section class="card install-card install-card--narrow"><h1 class="title" style="text-align:left">Error en instalador</h1><p class="subtitle" style="text-align:left">' . installer_h($message) . '</p>';
    if ($debug) {
        echo '<div class="flash"><pre style="margin:0;white-space:pre-wrap">' . installer_h($details) . '</pre></div>';
    }
    echo '</section></div></div></body></html>';
    exit;
}

function installer_create_pdo(array $db): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'] ?? 'localhost',
        (int) ($db['port'] ?? 3306),
        $db['name'] ?? '',
        $db['charset'] ?? 'utf8mb4'
    );

    return new PDO($dsn, (string) ($db['user'] ?? ''), (string) ($db['password'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function installer_normalize_config(array $config): array
{
    if (!isset($config['app']) || !is_array($config['app'])) {
        $config['app'] = [];
    }
    if (!isset($config['database']) || !is_array($config['database'])) {
        $config['database'] = [];
    }
    if (!isset($config['mail']) || !is_array($config['mail'])) {
        $config['mail'] = [];
    }
    if (!isset($config['installer']) || !is_array($config['installer'])) {
        $config['installer'] = [];
    }
    if (!isset($config['debug']) || !is_array($config['debug'])) {
        $config['debug'] = [];
    }
    if (!isset($config['oauth']) || !is_array($config['oauth'])) {
        $config['oauth'] = [];
    }

    if (!array_key_exists('name', $config['app'])) {
        $config['app']['name'] = 'WellFlow';
    }
    if (!array_key_exists('base_url', $config['app'])) {
        $config['app']['base_url'] = 'https://tu-dominio.com';
    }
    if (!array_key_exists('session_name', $config['app'])) {
        $config['app']['session_name'] = 'wellflow_php_session';
    }

    if (!array_key_exists('host', $config['database'])) {
        $config['database']['host'] = 'localhost';
    }
    if (!array_key_exists('port', $config['database'])) {
        $config['database']['port'] = 3306;
    }
    if (!array_key_exists('name', $config['database'])) {
        $config['database']['name'] = 'wellflow';
    }
    if (!array_key_exists('user', $config['database'])) {
        $config['database']['user'] = 'usuario_mysql';
    }
    if (!array_key_exists('password', $config['database'])) {
        $config['database']['password'] = '';
    }
    if (!array_key_exists('charset', $config['database'])) {
        $config['database']['charset'] = 'utf8mb4';
    }

    if (!array_key_exists('enabled', $config['installer'])) {
        $config['installer']['enabled'] = true;
    }
    if (!array_key_exists('token', $config['installer'])) {
        $config['installer']['token'] = '';
    }
    if (!array_key_exists('enabled', $config['debug'])) {
        $config['debug']['enabled'] = false;
    }
    if (!array_key_exists('token', $config['debug'])) {
        $config['debug']['token'] = '';
    }

    return $config;
}

function installer_request_token(): string
{
    return trim((string) ($_POST['installer_token'] ?? $_GET['token'] ?? ''));
}

function installer_is_authorized(array $config, string $token): bool
{
    $expected = trim((string) ($config['installer']['token'] ?? ''));
    if ($expected === '') {
        return true;
    }

    return $token !== '' && hash_equals($expected, $token);
}

function installer_csrf_token(): string
{
    if (empty($_SESSION['installer_csrf'])) {
        $_SESSION['installer_csrf'] = bin2hex(random_bytes(16));
    }

    return (string) $_SESSION['installer_csrf'];
}

function installer_verify_csrf(string $token): bool
{
    return !empty($_SESSION['installer_csrf']) && $token !== '' && hash_equals((string) $_SESSION['installer_csrf'], $token);
}

function installer_flash(string $type, string $message): void
{
    $_SESSION['installer_flash'][$type][] = $message;
}

function installer_pull_flash(string $type): array
{
    $messages = $_SESSION['installer_flash'][$type] ?? [];
    unset($_SESSION['installer_flash'][$type]);
    return $messages;
}

function installer_redirect(string $token): void
{
    $target = '/install.php';
    if ($token !== '') {
        $target .= '?token=' . urlencode($token);
    }

    header('Location: ' . $target);
    exit;
}

function installer_database_version(PDO $pdo): string
{
    return (string) $pdo->query('SELECT VERSION()')->fetchColumn();
}

function installer_database_stats(PDO $pdo): array
{
    $tables = ['users', 'daily_entries', 'invitations', 'social_accounts', 'password_reset_tokens'];
    $stats = [];

    foreach ($tables as $table) {
        try {
            $stats[$table] = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
        } catch (Throwable $exception) {
            $stats[$table] = null;
        }
    }

    return $stats;
}

function installer_run_fresh(PDO $pdo, string $root): void
{
    $schemaPath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'schema.sql';
    $seedPath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'seed.sql';

    $pdo->beginTransaction();
    try {
        foreach (installer_drop_statements() as $statement) {
            $pdo->exec($statement);
        }

        installer_execute_sql_file($pdo, $schemaPath);
        installer_execute_sql_file($pdo, $seedPath);
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
}

function installer_run_seed_only(PDO $pdo, string $root): void
{
    $seedPath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'seed.sql';

    $pdo->beginTransaction();
    try {
        installer_clear_demo_tables($pdo);
        installer_execute_sql_file($pdo, $seedPath);
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $exception;
    }
}

function installer_drop_statements(): array
{
    return [
        'DROP TABLE IF EXISTS password_reset_tokens',
        'DROP TABLE IF EXISTS social_accounts',
        'DROP TABLE IF EXISTS daily_entries',
        'DROP TABLE IF EXISTS invitations',
        'DROP TABLE IF EXISTS users',
    ];
}

function installer_clear_demo_tables(PDO $pdo): void
{
    foreach (['password_reset_tokens', 'social_accounts', 'daily_entries', 'invitations', 'users'] as $table) {
        $pdo->exec('DELETE FROM ' . $table);
    }
}

function installer_execute_sql_file(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException('No se pudo leer el archivo SQL: ' . $path);
    }

    foreach (installer_split_sql_statements($sql) as $statement) {
        $trimmed = trim($statement);
        if ($trimmed !== '') {
            $pdo->exec($trimmed);
        }
    }
}

function installer_split_sql_statements(string $sql): array
{
    $lines = preg_split('/\R/', $sql) ?: [];
    $buffer = '';
    $statements = [];

    foreach ($lines as $line) {
        $trimmedLine = ltrim($line);
        if ($trimmedLine === '' || installer_string_starts_with($trimmedLine, '--')) {
            continue;
        }

        $buffer .= $line . "\n";
        if (preg_match('/;\s*$/', rtrim($line))) {
            $statements[] = $buffer;
            $buffer = '';
        }
    }

    if (trim($buffer) !== '') {
        $statements[] = $buffer;
    }

    return $statements;
}

function installer_create_extra_demo_user(PDO $pdo, string $email, string $password, string $role): array
{
    $statement = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    if ($statement->fetchColumn()) {
        throw new RuntimeException('Ya existe un usuario con ese email: ' . $email);
    }

    $localPart = strstr($email, '@', true) ?: 'demo';
    $name = ucwords(str_replace(['.', '-', '_'], ' ', $localPart));

    $insert = $pdo->prepare('INSERT INTO users (id, email, name, password_hash, role, preferred_locale, theme_mode) VALUES (:id, :email, :name, :password_hash, :role, :preferred_locale, :theme_mode)');
    $insert->execute([
        'id' => installer_generate_uuid_like_id(),
        'email' => $email,
        'name' => $name,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role' => $role,
        'preferred_locale' => 'es',
        'theme_mode' => 'dark',
    ]);

    return [
        'email' => $email,
        'role' => $role,
    ];
}

function installer_create_extra_user_invitation(PDO $pdo, string $email, string $role): array
{
    $adminId = (string) $pdo->query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")->fetchColumn();
    if ($adminId === '') {
        throw new RuntimeException('No existe usuario admin para asociar la invitacion.');
    }

    $token = 'invite-' . strtolower(bin2hex(random_bytes(8)));
    $statement = $pdo->prepare('INSERT INTO invitations (id, email, role, token, invited_by_id, accepted_at, sent_at, created_at) VALUES (:id, :email, :role, :token, :invited_by_id, NOW(), NOW(), NOW())');
    $statement->execute([
        'id' => installer_generate_uuid_like_id(),
        'email' => $email,
        'role' => $role,
        'token' => $token,
        'invited_by_id' => $adminId,
    ]);

    return ['token' => $token];
}

function installer_generate_uuid_like_id(): string
{
    $hex = bin2hex(random_bytes(16));
    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20, 12));
}

function installer_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function installer_render_page(array $config, string $token, bool $authorized, bool $connected, ?string $pdoError, ?string $version, array $stats, array $errors, array $successes): string
{
    $tokenValue = installer_h($token);
    $statusClass = $connected ? 'install-status install-status--ok' : 'install-status install-status--bad';
    $dbName = installer_h((string) ($config['database']['name'] ?? ''));
    $dbHost = installer_h((string) ($config['database']['host'] ?? 'localhost'));
    $debugTokenValue = trim((string) ($config['debug']['token'] ?? ''));
    $directLoginUrl = '/index.php/login';
    if ($debugTokenValue !== '' && !empty($config['debug']['enabled'])) {
        $directLoginUrl .= '?debug=1&debug_token=' . rawurlencode($debugTokenValue);
    }

    ob_start();
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Instalacion | WellFlow</title><link rel="stylesheet" href="/assets/app.css"></head><body><div class="page-shell"><div class="shell install-shell">';

    foreach ($errors as $message) {
        echo '<div class="flash">' . installer_h($message) . '</div>';
    }
    foreach ($successes as $message) {
        echo '<div class="notice">' . installer_h($message) . '</div>';
    }

    echo '<section class="card install-hero">';
    echo '<p class="eyebrow" style="text-align:left">WellFlow Installer</p>';
    echo '<h1 class="title" style="text-align:left">Instalacion y mantenimiento</h1>';
    echo '<p class="subtitle" style="text-align:left">Prueba la conexion MariaDB y ejecuta acciones de schema, seed y usuarios demo directamente desde el servidor.</p>';
    echo '<div class="install-badges">';
    echo '<span class="install-badge">Host: <span class="mono">' . $dbHost . '</span></span>';
    echo '<span class="install-badge">Base: <span class="mono">' . $dbName . '</span></span>';
    echo '<span class="' . $statusClass . '">' . ($connected ? 'MariaDB conectada' : 'Sin conexion MariaDB') . '</span>';
    echo '</div>';
    echo '<div class="install-action-stack" style="margin-top:18px">';
    echo '<a class="secondary-button" href="' . installer_h($directLoginUrl) . '">Abrir app por index.php</a>';
    echo '<a class="secondary-button" href="/server-check.php">Ver server-check</a>';
    echo '</div></section>';

    if (!$authorized) {
        echo '<section class="card install-card install-card--narrow">';
        echo '<h2 style="margin-top:0">Acceso protegido</h2>';
        echo '<p class="subtitle" style="text-align:left">Introduce el token de instalacion configurado en <span class="mono">config.php</span>.</p>';
        echo '<form method="get" action="/install.php">';
        echo '<div class="field-group"><div class="field-head"><span>Token de instalacion</span></div><input class="field" type="password" name="token" required></div>';
        echo '<button class="primary-button" type="submit">Abrir instalador</button>';
        echo '</form></section>';
        echo '</div></div></body></html>';
        return (string) ob_get_clean();
    }

    echo '<div class="install-grid">';

    echo '<section class="card install-card">';
    echo '<h2 style="margin-top:0">Estado del servidor</h2>';
    echo '<div class="install-stat-list">';
    echo '<div class="install-stat"><span>Conexion</span><strong>' . ($connected ? 'Correcta' : 'Fallida') . '</strong></div>';
    echo '<div class="install-stat"><span>Version</span><strong>' . installer_h($version ?? 'No disponible') . '</strong></div>';
    echo '<div class="install-stat"><span>Usuarios</span><strong>' . installer_stat_value($stats['users'] ?? null) . '</strong></div>';
    echo '<div class="install-stat"><span>Registros</span><strong>' . installer_stat_value($stats['daily_entries'] ?? null) . '</strong></div>';
    echo '<div class="install-stat"><span>Invitaciones</span><strong>' . installer_stat_value($stats['invitations'] ?? null) . '</strong></div>';
    echo '<div class="install-stat"><span>Error actual</span><strong>' . installer_h($pdoError ?? 'Ninguno') . '</strong></div>';
    echo '</div>';
    echo installer_action_form($tokenValue, 'test_connection', 'Probar conexion MariaDB', 'secondary-button');
    echo '</section>';

    echo '<section class="card install-card">';
    echo '<h2 style="margin-top:0">Acciones de base</h2>';
    echo '<p class="subtitle" style="text-align:left">Usa reconstruccion completa cuando quieras regenerar tablas y datos demo. Usa recarga seed si el schema ya existe.</p>';
    echo '<div class="install-action-stack">';
    echo installer_action_form($tokenValue, 'fresh', 'Reconstruccion completa', 'danger-button');
    echo installer_action_form($tokenValue, 'seed_only', 'Recargar solo seed', 'secondary-button');
    echo '</div></section>';

    echo '<section class="card install-card">';
    echo '<h2 style="margin-top:0">Crear usuario extra</h2>';
    echo '<form method="post" action="/install.php">';
    echo '<input type="hidden" name="csrf" value="' . installer_h(installer_csrf_token()) . '">';
    echo '<input type="hidden" name="installer_token" value="' . $tokenValue . '">';
    echo '<input type="hidden" name="install_action" value="create_user">';
    echo '<div class="field-group"><div class="field-head"><span>Email</span></div><input class="field" type="email" name="email" placeholder="nuevo@wellflow.local" required></div>';
    echo '<div class="field-group"><div class="field-head"><span>Password</span></div><input class="field" type="text" name="password" value="Demo123!" required></div>';
    echo '<div class="field-group"><div class="field-head"><span>Rol</span></div><select class="select" name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select></div>';
    echo '<label class="install-checkbox"><input type="checkbox" name="with_invitation" value="1"> Crear invitacion asociada y marcarla como aceptada</label>';
    echo '<button class="primary-button" type="submit">Crear usuario demo</button>';
    echo '</form></section>';

    echo '<section class="card install-card">';
    echo '<h2 style="margin-top:0">Configurar conexion</h2>';
    echo '<p class="subtitle" style="text-align:left">Edita y guarda la configuracion activa de <span class="mono">config.php</span>. Si dejas la password vacia, se conserva la actual.</p>';
    echo '<form method="post" action="/install.php">';
    echo '<input type="hidden" name="csrf" value="' . installer_h(installer_csrf_token()) . '">';
    echo '<input type="hidden" name="installer_token" value="' . $tokenValue . '">';
    echo '<input type="hidden" name="install_action" value="save_connection_config">';
    echo '<div class="install-form-grid">';
    echo installer_text_input('Base URL', 'app_base_url', (string) $config['app']['base_url']);
    echo installer_text_input('Host MariaDB', 'db_host', (string) $config['database']['host']);
    echo installer_text_input('Puerto', 'db_port', (string) $config['database']['port']);
    echo installer_text_input('Base de datos', 'db_name', (string) $config['database']['name']);
    echo installer_text_input('Usuario DB', 'db_user', (string) $config['database']['user']);
    echo installer_password_input('Password DB', 'db_password', 'Deja vacio para mantener la actual');
    echo installer_text_input('Charset', 'db_charset', (string) $config['database']['charset']);
    echo installer_text_input('Token instalador', 'installer_token_value', (string) $config['installer']['token']);
    echo installer_text_input('Token debug', 'debug_token_value', (string) $config['debug']['token']);
    echo '</div>';
    echo '<div class="install-toggle-row">';
    echo installer_checkbox_input('Instalador habilitado', 'installer_enabled', (bool) $config['installer']['enabled']);
    echo installer_checkbox_input('Debug habilitado', 'debug_enabled', (bool) $config['debug']['enabled']);
    echo '</div>';
    echo '<button class="primary-button" type="submit">Guardar configuracion</button>';
    echo '</form></section>';

    echo '</div></div></div></body></html>';
    return (string) ob_get_clean();
}

function installer_action_form(string $tokenValue, string $action, string $label, string $buttonClass): string
{
    return '<form method="post" action="/install.php" class="install-inline-form">'
        . '<input type="hidden" name="csrf" value="' . installer_h(installer_csrf_token()) . '">'
        . '<input type="hidden" name="installer_token" value="' . $tokenValue . '">'
        . '<input type="hidden" name="install_action" value="' . installer_h($action) . '">'
        . '<button class="' . installer_h($buttonClass) . '" type="submit">' . installer_h($label) . '</button>'
        . '</form>';
}

function installer_stat_value(?int $value): string
{
    return $value === null ? 'No disponible' : (string) $value;
}

function installer_string_starts_with(string $value, string $prefix): bool
{
    return substr($value, 0, strlen($prefix)) === $prefix;
}

function installer_text_input(string $label, string $name, string $value): string
{
    return '<div class="field-group"><div class="field-head"><span>' . installer_h($label) . '</span></div><input class="field" type="text" name="' . installer_h($name) . '" value="' . installer_h($value) . '"></div>';
}

function installer_password_input(string $label, string $name, string $placeholder): string
{
    return '<div class="field-group"><div class="field-head"><span>' . installer_h($label) . '</span></div><input class="field" type="password" name="' . installer_h($name) . '" placeholder="' . installer_h($placeholder) . '"></div>';
}

function installer_checkbox_input(string $label, string $name, bool $checked): string
{
    return '<label class="install-checkbox"><input type="checkbox" name="' . installer_h($name) . '" value="1"' . ($checked ? ' checked' : '') . '> ' . installer_h($label) . '</label>';
}

function installer_build_updated_config(array $config, array $payload): array
{
    $updated = installer_normalize_config($config);
    $updated['app']['base_url'] = trim((string) ($payload['app_base_url'] ?? $updated['app']['base_url']));
    $updated['database']['host'] = trim((string) ($payload['db_host'] ?? $updated['database']['host']));
    $updated['database']['port'] = (int) ($payload['db_port'] ?? $updated['database']['port']);
    $updated['database']['name'] = trim((string) ($payload['db_name'] ?? $updated['database']['name']));
    $updated['database']['user'] = trim((string) ($payload['db_user'] ?? $updated['database']['user']));
    $updated['database']['charset'] = trim((string) ($payload['db_charset'] ?? $updated['database']['charset']));
    $updated['installer']['token'] = trim((string) ($payload['installer_token_value'] ?? $updated['installer']['token']));
    $updated['debug']['token'] = trim((string) ($payload['debug_token_value'] ?? $updated['debug']['token']));
    $updated['installer']['enabled'] = !empty($payload['installer_enabled']);
    $updated['debug']['enabled'] = !empty($payload['debug_enabled']);

    $newPassword = (string) ($payload['db_password'] ?? '');
    if ($newPassword !== '') {
        $updated['database']['password'] = $newPassword;
    }

    if ($updated['database']['host'] === '' || $updated['database']['name'] === '' || $updated['database']['user'] === '') {
        throw new InvalidArgumentException('Host, base de datos y usuario DB son obligatorios.');
    }

    if ($updated['database']['port'] <= 0) {
        throw new InvalidArgumentException('El puerto MariaDB debe ser un entero positivo.');
    }

    if ($updated['database']['charset'] === '') {
        throw new InvalidArgumentException('El charset no puede quedar vacio.');
    }

    return $updated;
}

function installer_save_config_file(string $path, array $config): void
{
    $content = "<?php\n\nreturn " . var_export($config, true) . ";\n";
    $directory = dirname($path);

    if ((!file_exists($path) && !is_writable($directory)) || (file_exists($path) && !is_writable($path))) {
        throw new RuntimeException('config.php no tiene permisos de escritura en el servidor.');
    }

    $temporaryPath = $path . '.tmp';
    if (file_put_contents($temporaryPath, $content, LOCK_EX) === false) {
        throw new RuntimeException('No se pudo escribir el archivo temporal de configuracion.');
    }

    if (!@rename($temporaryPath, $path)) {
        @unlink($temporaryPath);
        if (file_put_contents($path, $content, LOCK_EX) === false) {
            throw new RuntimeException('No se pudo guardar config.php.');
        }
    }
}