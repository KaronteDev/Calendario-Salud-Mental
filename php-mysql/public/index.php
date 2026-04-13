<?php

declare(strict_types=1);

$root = dirname(__DIR__);
$configFile = $root . DIRECTORY_SEPARATOR . 'config.php';

if (!file_exists($configFile)) {
    http_response_code(500);
    echo 'Falta php-mysql/config.php. Duplica config.php.example y completa la configuracion.';
    exit;
}

$config = require $configFile;

configure_runtime_debug($config);
register_shutdown_function(static function () use ($config): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        render_bootstrap_error_page($error, $config, 'fatal');
    }
});

session_name($config['app']['session_name'] ?? 'wellflow_php_session');
session_start();

date_default_timezone_set('Europe/Madrid');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($path !== '/' && string_starts_with($path, '/index.php')) {
    $path = substr($path, strlen('/index.php')) ?: '/';
}

if ($method === 'POST' && !verify_csrf(post('csrf'))) {
    flash('error', 'Sesion invalida. Recarga la pagina e intentalo de nuevo.');
    redirect(back_url('/'));
}

try {
    $pdo = create_pdo($config['database']);
} catch (Throwable $exception) {
    render_bootstrap_error_page($exception, $config, 'database');
}

route($method, $path, $pdo, $config);

function configure_runtime_debug(array $config): void
{
    $enabled = debug_errors_enabled($config);
    ini_set('display_errors', $enabled ? '1' : '0');
    ini_set('display_startup_errors', $enabled ? '1' : '0');
    error_reporting(E_ALL);
}

function debug_errors_enabled(array $config): bool
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

function render_bootstrap_error_page($error, array $config, string $context = ''): void
{
    if (headers_sent() === false) {
        http_response_code(500);
    }

    $debug = debug_errors_enabled($config);
    $message = 'Error interno de la aplicacion.';
    $details = '';

    if ($error instanceof Throwable) {
        $message = $error->getMessage();
        $details = $error->getFile() . ':' . $error->getLine() . "\n\n" . $error->getTraceAsString();
    } elseif (is_array($error)) {
        $message = (string) ($error['message'] ?? $message);
        $details = (string) (($error['file'] ?? '') . ':' . ($error['line'] ?? ''));
    }

    $installUrl = '/install.php';
    $installerToken = trim((string) ($config['installer']['token'] ?? ''));
    if ($installerToken !== '') {
        $installUrl .= '?token=' . rawurlencode($installerToken);
    }

    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Error | WellFlow</title><link rel="stylesheet" href="/assets/app.css"></head><body><div class="page-shell"><div class="shell"><section class="card install-card install-card--narrow"><p class="eyebrow" style="text-align:left">WellFlow</p><h1 class="title" style="text-align:left">Error interno</h1><p class="subtitle" style="text-align:left">' . htmlspecialchars($debug ? $message : 'La aplicacion ha fallado durante el arranque. Usa la pagina de instalacion para revisar MariaDB o activa debug con token.', ENT_QUOTES, 'UTF-8') . '</p><div class="install-action-stack"><a class="secondary-button" href="' . htmlspecialchars($installUrl, ENT_QUOTES, 'UTF-8') . '">Abrir instalador</a></div>';

    if ($debug) {
        echo '<div class="flash" style="margin-top:18px"><strong>Contexto:</strong> ' . htmlspecialchars($context, ENT_QUOTES, 'UTF-8') . '<br><br><pre style="margin:0;white-space:pre-wrap">' . htmlspecialchars($details, ENT_QUOTES, 'UTF-8') . '</pre></div>';
    }

    echo '</section></div></div></body></html>';
    exit;
}

function string_starts_with(string $value, string $prefix): bool
{
    return substr($value, 0, strlen($prefix)) === $prefix;
}

function route(string $method, string $path, PDO $pdo, array $config): void
{
    if ($method === 'GET' && $path === '/oauth/start') {
        start_oauth($config);
        return;
    }

    if ($method === 'GET' && $path === '/oauth/callback') {
        handle_oauth_callback($pdo, $config);
        return;
    }

    if ($method === 'GET' && $path === '/login') {
        show_login();
        return;
    }

    if ($method === 'POST' && $path === '/login') {
        handle_login($pdo);
        return;
    }

    if ($method === 'GET' && $path === '/logout') {
        logout();
        return;
    }

    if ($method === 'GET' && $path === '/signup') {
        show_signup($pdo);
        return;
    }

    if ($method === 'POST' && $path === '/signup') {
        handle_signup($pdo);
        return;
    }

    if ($method === 'GET' && $path === '/forgot-password') {
        show_forgot_password();
        return;
    }

    if ($method === 'POST' && $path === '/forgot-password') {
        handle_forgot_password($pdo, $config);
        return;
    }

    if ($method === 'GET' && $path === '/reset-password') {
        show_reset_password($pdo);
        return;
    }

    if ($method === 'POST' && $path === '/reset-password') {
        handle_reset_password($pdo);
        return;
    }

    if (preg_match('#^/day/(\d{4}-\d{2}-\d{2})$#', $path, $matches)) {
        require_auth($pdo);

        if ($method === 'GET') {
            show_day($pdo, $matches[1]);
            return;
        }

        if ($method === 'POST') {
            handle_day($pdo, $matches[1]);
            return;
        }
    }

    if ($path === '/admin/users') {
        require_admin($pdo);

        if ($method === 'GET') {
            show_admin($pdo);
            return;
        }

        if ($method === 'POST') {
            handle_admin($pdo, $config);
            return;
        }
    }

    if ($method === 'POST' && $path === '/preferences') {
        handle_preferences($pdo);
        return;
    }

    if ($path === '/') {
        require_auth($pdo);
        show_dashboard($pdo);
        return;
    }

    http_response_code(404);
    render_page('No encontrado', '<div class="card auth-card"><h1 class="title">404</h1><p class="subtitle">La pagina solicitada no existe.</p></div>');
}

function create_pdo(array $db): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $db['host'],
        $db['port'],
        $db['name'],
        $db['charset'] ?? 'utf8mb4'
    );

    return new PDO($dsn, $db['user'], $db['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}

function post(string $key, $default = '')
{
    return $_POST[$key] ?? $default;
}

function query_param(string $key, $default = null)
{
    return $_GET[$key] ?? $default;
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'][$type][] = $message;
}

function pull_flash(string $type): array
{
    $messages = $_SESSION['flash'][$type] ?? [];
    unset($_SESSION['flash'][$type]);

    return $messages;
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }

    return $_SESSION['csrf'];
}

function verify_csrf(?string $token): bool
{
    return !empty($token) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

function redirect(string $url): void
{
    header('Location: ' . $url);
    exit;
}

function back_url(string $fallback): string
{
    return $_SERVER['HTTP_REFERER'] ?? $fallback;
}

function app_url(string $path = ''): string
{
    global $config;
    $base = rtrim($config['app']['base_url'] ?? '', '/');
    return $base . '/' . ltrim($path, '/');
}

function current_user(PDO $pdo): ?array
{
    if (empty($_SESSION['user_id'])) {
      return null;
    }

    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $_SESSION['user_id']]);
    $cached = $statement->fetch() ?: null;
    return $cached;
}

function require_auth(PDO $pdo): array
{
    $user = current_user($pdo);
    if (!$user) {
        redirect('/login');
    }
    return $user;
}

function require_admin(PDO $pdo): array
{
    $user = require_auth($pdo);
    if (($user['role'] ?? 'user') !== 'admin') {
        redirect('/');
    }
    return $user;
}

function logout(): void
{
    $_SESSION = [];
    session_destroy();
    redirect('/login');
}

function uuid(): string
{
    return bin2hex(random_bytes(16));
}

function month_key(): string
{
    $month = (string) query_param('month', date('Y-m'));
    return preg_match('/^\d{4}-\d{2}$/', $month) ? $month : date('Y-m');
}

function render_page(string $title, string $content, array $page = []): void
{
    $errorMessages = pull_flash('error');
    $successMessages = pull_flash('success');
    $theme = $_COOKIE['wellflow-theme'] ?? 'dark';
    $class = $theme === 'light' ? 'theme-light' : 'theme-dark';

    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . h($title) . ' | WellFlow</title><link rel="stylesheet" href="/assets/app.css"><script src="https://cdn.jsdelivr.net/npm/chart.js"></script></head><body class="' . $class . '"><div class="page-shell">';
    foreach ($errorMessages as $message) {
        echo '<div class="shell"><div class="flash">' . h($message) . '</div></div>';
    }
    foreach ($successMessages as $message) {
        echo '<div class="shell"><div class="notice">' . h($message) . '</div></div>';
    }
    echo $content;
    echo '</div></body></html>';
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function show_login(): void
{
    $content = auth_shell('Iniciar sesion', 'Accede para continuar con tu seguimiento.', render_login_form());
    render_page('Login', $content);
}

function render_login_form(): string
{
    return '<form method="post" action="/login">'
        . csrf_input()
        . social_grid()
        . '<div class="divider">o continua con</div>'
        . field('Email', '<input class="field" type="email" name="email" required>')
        . field('Contrasena', '<input class="field" type="password" name="password" required>', '<a class="helper-link" href="/forgot-password">Has olvidado tu contrasena?</a>')
        . '<button class="primary-button" type="submit">Iniciar sesion</button>'
        . '<div class="helper-center">Necesitas una cuenta? <a class="helper-link" href="/signup">Registrate</a></div>'
        . '</form>';
}

function show_signup(PDO $pdo): void
{
    $token = (string) query_param('invite', '');
    $invitation = null;
    if ($token !== '') {
        $statement = $pdo->prepare('SELECT * FROM invitations WHERE token = :token LIMIT 1');
        $statement->execute(['token' => $token]);
        $invitation = $statement->fetch() ?: null;
    }

    $emailValue = $invitation['email'] ?? '';
    $content = auth_shell('Crear cuenta', 'Crea tu cuenta o acepta una invitacion para entrar.',
        '<form method="post" action="/signup">'
        . csrf_input()
        . '<input type="hidden" name="invite_token" value="' . h($token) . '">'
        . field('Nombre', '<input class="field" type="text" name="name" required>')
        . field('Email', '<input class="field" type="email" name="email" value="' . h($emailValue) . '" ' . ($emailValue ? 'readonly' : '') . ' required>')
        . field('Contrasena', '<input class="field" type="password" name="password" required>')
        . field('Confirmar contrasena', '<input class="field" type="password" name="password_confirm" required>')
        . '<div class="helper-center">Ya tienes cuenta? <a class="helper-link" href="/login">Inicia sesion</a></div>'
        . '<button class="primary-button" type="submit">Crear cuenta</button>'
        . '</form>'
    );
    render_page('Signup', $content);
}

function show_forgot_password(): void
{
    $content = auth_shell('Has olvidado tu contrasena?', 'Introduce tu email y te enviaremos un enlace para restablecer la contrasena.',
        '<form method="post" action="/forgot-password">'
        . csrf_input()
        . field('Email', '<input class="field" type="email" name="email" required>')
        . '<button class="primary-button" type="submit">Enviar enlace de recuperacion</button>'
        . '<div class="helper-center"><a class="helper-link" href="/login">Volver al login</a></div>'
        . '</form>'
    );
    render_page('Recuperar contrasena', $content);
}

function show_reset_password(PDO $pdo): void
{
    $token = (string) query_param('token', '');
    $statement = $pdo->prepare('SELECT * FROM password_reset_tokens WHERE token = :token LIMIT 1');
    $statement->execute(['token' => $token]);
    $resetToken = $statement->fetch() ?: null;

    if (!$resetToken || strtotime((string) $resetToken['expires_at']) <= time()) {
        flash('error', 'El enlace de recuperacion no es valido o ha caducado.');
        redirect('/forgot-password');
    }

    $content = auth_shell('Restablecer contrasena', 'Define una nueva contrasena para volver a entrar en tu cuenta.',
        '<form method="post" action="/reset-password">'
        . csrf_input()
        . '<input type="hidden" name="token" value="' . h($token) . '">'
        . field('Nueva contrasena', '<input class="field" type="password" name="password" required>')
        . field('Confirmar nueva contrasena', '<input class="field" type="password" name="password_confirm" required>')
        . '<button class="primary-button" type="submit">Restablecer contrasena</button>'
        . '</form>'
    );
    render_page('Restablecer contrasena', $content);
}

function auth_shell(string $title, string $subtitle, string $formHtml): string
{
    return '<div class="card auth-card">'
        . '<div class="brand-mark"><div class="brand-mark__inner">*</div></div>'
        . '<p class="eyebrow">WellFlow</p>'
        . '<h1 class="title">' . h($title) . '</h1>'
        . '<p class="subtitle">' . h($subtitle) . '</p>'
        . $formHtml
        . '</div>';
}

function social_grid(): string
{
    $items = [
        'Google' => ['icon' => google_icon(), 'provider' => 'google'],
        'Facebook' => ['icon' => facebook_icon(), 'provider' => 'facebook'],
        'Instagram' => ['icon' => instagram_icon(), 'provider' => 'instagram'],
        'LinkedIn' => ['icon' => linkedin_icon(), 'provider' => 'linkedin'],
    ];

    $html = '<div class="social-grid">';
    foreach ($items as $label => $item) {
        $html .= '<a class="social-link" href="/oauth/start?provider=' . h($item['provider']) . '"><span class="social-link__label"><span class="social-link__icon">' . $item['icon'] . '</span><span>' . h($label) . '</span></span><span>&rarr;</span></a>';
    }
    $html .= '</div>';

    return $html;
}

function field(string $label, string $inputHtml, string $rightHtml = ''): string
{
    return '<div class="field-group"><div class="field-head"><span>' . h($label) . '</span>' . $rightHtml . '</div>' . $inputHtml . '</div>';
}

function csrf_input(): string
{
    return '<input type="hidden" name="csrf" value="' . h(csrf_token()) . '">';
}

function handle_login(PDO $pdo): void
{
    $email = strtolower(trim((string) post('email')));
    $password = (string) post('password');

    $statement = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch() ?: null;

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        flash('error', 'Usuario o contrasena incorrectos.');
        redirect('/login');
    }

    $_SESSION['user_id'] = $user['id'];
    setcookie('wellflow-theme', (string) $user['theme_mode'], time() + 31536000, '/');
    redirect('/');
}

function handle_signup(PDO $pdo): void
{
    $name = trim((string) post('name'));
    $email = strtolower(trim((string) post('email')));
    $password = (string) post('password');
    $passwordConfirm = (string) post('password_confirm');
    $inviteToken = trim((string) post('invite_token'));

    if ($password !== $passwordConfirm) {
        flash('error', 'Las contrasenas no coinciden.');
        redirect(back_url('/signup'));
    }

    $existing = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $existing->execute(['email' => $email]);
    if ($existing->fetch()) {
        flash('error', 'Ese email ya esta registrado.');
        redirect(back_url('/signup'));
    }

    $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $role = $userCount === 0 ? 'admin' : 'user';

    if ($userCount > 0) {
        if ($inviteToken === '') {
            flash('error', 'Necesitas una invitacion para crear una cuenta nueva.');
            redirect('/signup');
        }

        $statement = $pdo->prepare('SELECT * FROM invitations WHERE token = :token LIMIT 1');
        $statement->execute(['token' => $inviteToken]);
        $invitation = $statement->fetch() ?: null;

        if (!$invitation || !empty($invitation['accepted_at']) || strtolower((string) $invitation['email']) !== $email) {
            flash('error', 'La invitacion no es valida para este email.');
            redirect('/signup?invite=' . urlencode($inviteToken));
        }

        $role = (string) $invitation['role'];
    }

    $userId = uuid();
    $statement = $pdo->prepare('INSERT INTO users (id, email, name, password_hash, role, preferred_locale, theme_mode) VALUES (:id, :email, :name, :password_hash, :role, :preferred_locale, :theme_mode)');
    $statement->execute([
        'id' => $userId,
        'email' => $email,
        'name' => $name,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role' => $role,
        'preferred_locale' => 'es',
        'theme_mode' => 'dark',
    ]);

    if ($inviteToken !== '') {
        $statement = $pdo->prepare('UPDATE invitations SET accepted_at = NOW() WHERE token = :token');
        $statement->execute(['token' => $inviteToken]);
    }

    $_SESSION['user_id'] = $userId;
    setcookie('wellflow-theme', 'dark', time() + 31536000, '/');
    redirect('/');
}

function handle_forgot_password(PDO $pdo, array $config): void
{
    $email = strtolower(trim((string) post('email')));
    $statement = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch() ?: null;

    if ($user) {
        $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute(['user_id' => $user['id']]);
        $token = bin2hex(random_bytes(16));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $pdo->prepare('INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (:id, :user_id, :token, :expires_at)')->execute([
            'id' => uuid(),
            'user_id' => $user['id'],
            'token' => $token,
            'expires_at' => $expiresAt,
        ]);

        $link = app_url('/reset-password?token=' . $token);
        if (!empty($config['mail']['enabled'])) {
            @mail($email, 'Recupera tu acceso a WellFlow', "Abre este enlace para restablecer tu contrasena:\n\n" . $link, 'From: ' . ($config['mail']['from_name'] ?? 'WellFlow') . ' <' . ($config['mail']['from'] ?? 'no-reply@example.com') . '>');
            flash('success', 'Si el email existe, hemos enviado un enlace de recuperacion.');
        } else {
            flash('success', 'SMTP no esta configurado. Usa este enlace local: ' . $link);
        }
    } else {
        flash('success', 'Si el email existe, hemos enviado un enlace de recuperacion.');
    }

    redirect('/forgot-password');
}

function handle_reset_password(PDO $pdo): void
{
    $token = trim((string) post('token'));
    $password = (string) post('password');
    $passwordConfirm = (string) post('password_confirm');

    if ($password !== $passwordConfirm) {
        flash('error', 'Las contrasenas no coinciden.');
        redirect('/reset-password?token=' . urlencode($token));
    }

    $statement = $pdo->prepare('SELECT * FROM password_reset_tokens WHERE token = :token LIMIT 1');
    $statement->execute(['token' => $token]);
    $reset = $statement->fetch() ?: null;

    if (!$reset || strtotime((string) $reset['expires_at']) <= time()) {
        flash('error', 'El enlace de recuperacion no es valido o ha caducado.');
        redirect('/forgot-password');
    }

    $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id')->execute([
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'id' => $reset['user_id'],
    ]);
    $pdo->prepare('DELETE FROM password_reset_tokens WHERE user_id = :user_id')->execute(['user_id' => $reset['user_id']]);
    flash('success', 'La contrasena se ha actualizado correctamente.');
    redirect('/login');
}

function show_dashboard(PDO $pdo): void
{
    $user = require_auth($pdo);
    $locale = dashboard_locale((string) ($user['preferred_locale'] ?? 'es'));
    $dictionary = dashboard_dictionary($locale);
    $localeOptions = dashboard_locale_options();
    $themeMode = normalize_theme((string) ($_COOKIE['wellflow-theme'] ?? $user['theme_mode'] ?? 'dark')) ?? 'dark';
    $themeLabel = $themeMode === 'dark' ? $dictionary['lightMode'] : $dictionary['darkMode'];
    $month = month_key();
    $monthStart = $month . '-01';
    $monthEnd = date('Y-m-t', strtotime($monthStart));

    $statement = $pdo->prepare('SELECT * FROM daily_entries WHERE user_id = :user_id AND date_key BETWEEN :month_start AND :month_end ORDER BY date_key ASC');
    $statement->execute([
        'user_id' => $user['id'],
        'month_start' => $monthStart,
        'month_end' => $monthEnd,
    ]);
    $entries = $statement->fetchAll();

    $entryMap = [];
    foreach ($entries as $entry) {
        $entryMap[$entry['date_key']] = $entry;
    }

    $stats = build_stats($entries);
    $days = build_calendar_days($month);
    $chartPayload = build_chart_payload($entries);
    $chartLabels = [
        'mood' => $dictionary['chartMood'],
        'mental' => $dictionary['chartMental'],
        'physical' => $dictionary['chartPhysical'],
        'sleep' => $dictionary['chartSleep'],
        'hours' => $dictionary['chartHours'],
        'completion' => $dictionary['chartCompletion'],
    ];
    $chartTitles = [
        'trend' => $dictionary['dailyRatings'],
        'sleep' => $dictionary['sleepHoursPerDay'],
        'profile' => $dictionary['wellnessProfile'],
        'goals' => $dictionary['goalsCompletion'],
    ];

    ob_start();
    echo '<div class="mesh-overlay"></div>';
    echo '<div class="dashboard-glow"></div>';
    echo '<div class="shell dashboard-shell" data-dashboard-root>';
    echo '<section class="card dashboard-hero">';
    echo '<div class="dashboard-hero__copy">';
    echo '<p class="eyebrow dashboard-hero__eyebrow">Wellness</p>';
    echo '<h1 class="title dashboard-hero__title">' . h($dictionary['appName']) . '</h1>';
    echo '<p class="subtitle dashboard-hero__subtitle">' . h($dictionary['appSubtitle']) . '</p>';
    echo '</div>';
    echo '<div class="dashboard-controls">';
    echo '<form method="post" action="/preferences" class="dashboard-inline-form">' . csrf_input();
    echo '<input type="hidden" name="toggle_theme" value="1">';
    echo '<button class="dashboard-control dashboard-control--compact" type="submit" aria-label="' . h($themeLabel) . '" title="' . h($themeLabel) . '"><span class="dashboard-control__icon">' . dashboard_icon($themeMode === 'dark' ? 'sun' : 'moon') . '</span></button>';
    echo '</form>';
    echo '<div class="dashboard-menu" data-menu>'; 
    echo '<button class="dashboard-control dashboard-control--compact" type="button" data-menu-trigger aria-label="' . h((string) $dictionary['language']) . '" title="' . h((string) $dictionary['language']) . '"><span class="dashboard-control__icon">' . dashboard_icon('language') . '</span><span class="dashboard-control__meta">' . h((string) strtoupper($locale)) . '</span></button>';
    echo '<div class="dashboard-menu__panel" data-menu-panel>';
    foreach ($localeOptions as $option) {
        echo '<form method="post" action="/preferences" class="dashboard-menu__form">' . csrf_input();
        echo '<input type="hidden" name="locale" value="' . h($option['code']) . '">';
        echo '<button class="dashboard-menu__item' . ($locale === $option['code'] ? ' is-active' : '') . '" type="submit"><span class="dashboard-menu__flag">' . h($option['flag']) . '</span><span>' . h($option['label']) . '</span>' . ($locale === $option['code'] ? '<span class="dashboard-menu__check">OK</span>' : '') . '</button>';
        echo '</form>';
    }
    echo '</div></div>';
    echo '<a class="today-button" href="/day/' . date('Y-m-d') . '">+ ' . h($dictionary['today']) . '</a>';
    echo '<div class="dashboard-menu" data-menu>';
    echo '<button class="dashboard-control" type="button" data-menu-trigger><span class="dashboard-avatar">' . h(strtoupper(substr((string) ($user['name'] ?? 'U'), 0, 1))) . '</span><span>' . h((string) ($user['name'] ?? 'Usuario')) . '</span></button>';
    echo '<div class="dashboard-menu__panel dashboard-menu__panel--profile" data-menu-panel>';
    echo '<div class="dashboard-profile__card"><strong>' . h((string) ($user['name'] ?? 'Usuario')) . '</strong><span>' . h((string) ($user['email'] ?? '')) . '</span></div>';
    if (($user['role'] ?? 'user') === 'admin') {
        echo '<a class="dashboard-menu__item" href="/admin/users">' . h($dictionary['manageUsers']) . '</a>';
    }
    echo '<a class="dashboard-menu__item" href="/logout">' . h($dictionary['logout']) . '</a>';
    echo '</div></div>';
    echo '</div>';
    echo '</section>';

    echo '<section class="card month-card dashboard-panel">';
    echo '<div class="calendar-header">';
    echo '<a class="calendar-button" href="/?month=' . date('Y-m', strtotime($monthStart . ' -1 month')) . '">&larr;</a>';
    echo '<h2 class="calendar-title">' . h(localized_month_label($month, $locale)) . '</h2>';
    echo '<a class="calendar-button" href="/?month=' . date('Y-m', strtotime($monthStart . ' +1 month')) . '">&rarr;</a>';
    echo '</div>';
    echo '<div class="weekday-row">';
    foreach ($dictionary['weekdays'] as $weekday) {
        echo '<div>' . h((string) $weekday) . '</div>';
    }
    echo '</div><div class="calendar-grid">';

    foreach ($days as $day) {
        $dateKey = $day['date'];
        $entry = $entryMap[$dateKey] ?? null;
        $isCurrentMonth = $day['current_month'];
        $isToday = $dateKey === date('Y-m-d');
        $moodLabel = $entry ? (string) $dictionary['moodLabels'][(int) $entry['mood']] : '';
        $exerciseDetail = '-';
        if ($entry && (int) $entry['exercise_done']) {
            $exerciseType = trim((string) ($entry['exercise_type'] ?? $dictionary['exercise']));
            $exerciseMinutes = (int) ($entry['exercise_minutes'] ?? 0);
            $exerciseDetail = $exerciseType . ' · ' . $exerciseMinutes . ' ' . $dictionary['minutes'];
        }
        $leisureDetail = $entry && (int) $entry['leisure_done'] ? trim((string) ($entry['leisure_activity'] ?? $dictionary['leisure'])) : '-';
        $notesDetail = $entry ? trim((string) ($entry['notes'] ?? '')) : '';
        $cellClass = 'calendar-cell' . ($isCurrentMonth ? '' : ' calendar-cell--muted') . ($isToday ? ' calendar-cell--active' : '') . ($entry ? ' calendar-cell--filled ' . mood_surface_class((int) $entry['mood']) : '');
        echo '<button class="' . h(trim($cellClass)) . '" type="button"';
        echo ' data-date="' . h($dateKey) . '"';
        echo ' data-date-label="' . h(localized_date_label($dateKey, $locale)) . '"';
        echo ' data-edit-url="/day/' . h($dateKey) . '"';
        echo ' data-has-entry="' . ($entry ? '1' : '0') . '"';
        echo ' data-mood-label="' . h($moodLabel) . '"';
        echo ' data-mental="' . h($entry ? (string) $entry['mental_state'] . '/5' : '-') . '"';
        echo ' data-physical="' . h($entry ? (string) $entry['physical_state'] . '/5' : '-') . '"';
        echo ' data-sleep-hours="' . h($entry ? (string) $entry['sleep_hours'] . 'h' : '-') . '"';
        echo ' data-nutrition="' . h($entry && (int) $entry['nutrition_done'] ? 'OK' : '—') . '"';
        echo ' data-exercise="' . h($entry && (int) $entry['exercise_done'] ? 'OK' : '—') . '"';
        echo ' data-leisure="' . h($entry && (int) $entry['leisure_done'] ? 'OK' : '—') . '"';
        echo ' data-exercise-detail="' . h($exerciseDetail) . '"';
        echo ' data-leisure-detail="' . h($leisureDetail) . '"';
        echo ' data-notes-detail="' . h($notesDetail !== '' ? $notesDetail : '-') . '">';
        echo '<div class="calendar-cell__day">' . h((string) $day['day']) . '</div>';
        if ($entry) {
            echo '<div class="mood-orb ' . mood_class((int) $entry['mood']) . '"></div>';
            echo '<div class="goal-dots">';
            if ((int) $entry['nutrition_done']) { echo '<span class="goal-dot"></span>'; }
            if ((int) $entry['exercise_done']) { echo '<span class="goal-dot"></span>'; }
            if ((int) $entry['leisure_done']) { echo '<span class="goal-dot"></span>'; }
            echo '</div>';
        }
        echo '</button>';
    }

    echo '</div>';
    echo '<div class="legend">';
    echo legend_item($dictionary['legendBad'], '#ff7b7b');
    echo legend_item($dictionary['legendNormal'], '#f4bf3a');
    echo legend_item($dictionary['legendGreat'], '#39d98a');
    echo legend_item($dictionary['legendGoal'], '#3ea4ff');
    echo '</div></section>';

    echo '<h2 class="section-title">' . h($dictionary['monthSummary']) . '</h2>';
    echo '<section class="stats-grid">';
    echo stat_card('😊', '#dff7e7', $dictionary['avgMood'], number_format($stats['avg_mood'], 1) . '/5');
    echo stat_card('🧠', '#e1efff', $dictionary['avgMental'], number_format($stats['avg_mental'], 1) . '/5');
    echo stat_card('💪', '#ffeecf', $dictionary['avgPhysical'], number_format($stats['avg_physical'], 1) . '/5');
    echo stat_card('😴', '#f2e4ff', $dictionary['avgSleep'], number_format($stats['avg_sleep'], 1) . '/5', number_format($stats['avg_sleep_hours'], 1) . $dictionary['avgSleepHours']);
    echo stat_card('🏃', '#dcf7eb', $dictionary['exercise'], (string) $stats['exercise_completion'] . '%', $dictionary['daysAchieved']);
    echo stat_card('🍽️', '#fff4cb', $dictionary['food'], (string) $stats['nutrition_completion'] . '%', $dictionary['daysAchieved']);
    echo '</section>';

    echo '<h2 class="section-title">' . h($dictionary['monthCharts']) . '</h2>';
    echo '<section class="card chart-card dashboard-panel">';
    echo '<div class="tab-strip" data-chart-tabs>';
    echo '<a class="is-active" href="#trend" data-chart-tab="trend">' . h($dictionary['trends']) . '</a>';
    echo '<a href="#sleep" data-chart-tab="sleep">' . h($dictionary['sleepChart']) . '</a>';
    echo '<a href="#profile" data-chart-tab="profile">' . h($dictionary['profile']) . '</a>';
    echo '<a href="#goals" data-chart-tab="goals">' . h($dictionary['goals']) . '</a>';
    echo '</div>';
    echo '<div class="chart-card__panel">';
    echo '<p class="chart-card__title" data-chart-title>' . h($chartTitles['trend']) . '</p>';
    echo '<div class="chart-stack">';
    echo '<div class="chart-placeholder is-active" id="trend" data-chart-panel="trend"><canvas id="trendChart" height="120"></canvas></div>';
    echo '<div class="chart-placeholder" id="sleep" data-chart-panel="sleep"><canvas id="sleepChart" height="120"></canvas></div>';
    echo '<div class="chart-placeholder" id="profile" data-chart-panel="profile"><canvas id="profileChart" height="120"></canvas></div>';
    echo '<div class="chart-placeholder" id="goals" data-chart-panel="goals"><canvas id="goalsChart" height="120"></canvas></div>';
    echo '</div>';
    echo '<div class="chart-stat-row" data-sleep-stats><div class="chart-stat"><span>' . h($dictionary['average']) . '</span><strong>' . h(number_format($stats['avg_sleep_hours'], 1)) . '</strong></div><div class="chart-stat"><span>' . h($dictionary['maximum']) . '</span><strong>' . h((string) sleep_hours_max($entries)) . '</strong></div><div class="chart-stat"><span>' . h($dictionary['minimum']) . '</span><strong>' . h((string) sleep_hours_min($entries)) . '</strong></div></div>';
    echo '</div>';
    echo '</section>';

    echo '<div class="quickview-overlay" data-quickview hidden><div class="quickview-sheet"><div class="quickview-handle"></div><div class="quickview-header"><div><p class="eyebrow quickview-eyebrow" data-quickview-eyebrow>' . h($dictionary['quickView']) . '</p><h3 class="quickview-title" data-quickview-date></h3></div><button class="quickview-close" type="button" data-quickview-close>' . dashboard_icon('close') . '</button></div><div class="quickview-body" data-quickview-body></div></div></div>';

    echo '<script>window.wellflowCharts=' . json_encode($chartPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>';
    echo '<script>window.wellflowChartLabels=' . json_encode($chartLabels, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>';
    echo '<script>window.wellflowChartTitles=' . json_encode($chartTitles, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>';
    echo '<script>window.wellflowQuickViewText=' . json_encode([
        'quickView' => $dictionary['quickView'],
        'mood' => $dictionary['mood'],
        'mentalState' => $dictionary['mentalState'],
        'physicalState' => $dictionary['physicalState'],
        'sleepHoursLabel' => $dictionary['sleepHoursLabel'],
        'completedGoals' => $dictionary['completedGoals'],
        'foodGoal' => $dictionary['foodGoal'],
        'exerciseGoal' => $dictionary['exerciseGoal'],
        'leisureGoal' => $dictionary['leisureGoal'],
        'exerciseDetail' => $dictionary['exerciseDetail'],
        'leisureDetail' => $dictionary['leisureDetail'],
        'notesDetail' => $dictionary['notesDetail'],
        'editRecord' => $dictionary['editRecord'],
        'createRecord' => $dictionary['createRecord'],
        'close' => $dictionary['close'],
        'noRecordPrefix' => $dictionary['noRecord'],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>';
    echo '<script>' . dashboard_chart_script() . '</script>';
    echo '</div>';

    render_page('Dashboard', ob_get_clean());
}

function handle_preferences(PDO $pdo): void
{
    $user = require_auth($pdo);
    $updates = [];

    $locale = normalize_locale((string) post('locale'));
    if ($locale !== null) {
        $updates['preferred_locale'] = $locale;
    }

    $theme = normalize_theme((string) post('theme'));
    if ($theme === null && post('toggle_theme') === '1') {
        $currentTheme = normalize_theme((string) ($user['theme_mode'] ?? 'dark')) ?? 'dark';
        $theme = $currentTheme === 'dark' ? 'light' : 'dark';
    }
    if ($theme !== null) {
        $updates['theme_mode'] = $theme;
        setcookie('wellflow-theme', $theme, time() + 31536000, '/');
    }

    if ($updates !== []) {
        $fields = [];
        foreach (array_keys($updates) as $field) {
            $fields[] = $field . ' = :' . $field;
        }
        $updates['id'] = $user['id'];
        $statement = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id');
        $statement->execute($updates);
    }

    redirect(back_url('/'));
}

function dashboard_locale_options(): array
{
    return [
        ['code' => 'es', 'label' => 'Espanol', 'flag' => 'ES'],
        ['code' => 'en', 'label' => 'English', 'flag' => 'GB'],
        ['code' => 'fr', 'label' => 'Francais', 'flag' => 'FR'],
        ['code' => 'ru', 'label' => 'Russkiy', 'flag' => 'RU'],
    ];
}

function dashboard_locale(string $locale): string
{
    return normalize_locale($locale) ?? 'es';
}

function normalize_locale(string $locale): ?string
{
    return in_array($locale, ['es', 'en', 'fr', 'ru'], true) ? $locale : null;
}

function normalize_theme(string $theme): ?string
{
    return in_array($theme, ['light', 'dark'], true) ? $theme : null;
}

function dashboard_dictionary(string $locale): array
{
    $translations = [
        'es' => [
            'appName' => 'Salud',
            'appSubtitle' => 'Calendario de bienestar',
            'today' => 'Hoy',
            'manageUsers' => 'Gestion de usuarios',
            'logout' => 'Cerrar sesion',
            'dailyLog' => 'Registro diario',
            'howAreYou' => 'Como te sientes?',
            'monthSummary' => 'Resumen del mes',
            'monthCharts' => 'Graficos del mes',
            'language' => 'Idioma',
            'darkMode' => 'Modo oscuro',
            'lightMode' => 'Modo claro',
            'legendBad' => 'Muy mal',
            'legendNormal' => 'Normal',
            'legendGreat' => 'Excelente',
            'legendGoal' => 'Objetivo',
            'weekdays' => ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'],
            'avgMood' => 'Animo promedio',
            'avgMental' => 'Estado mental',
            'avgPhysical' => 'Estado fisico',
            'avgSleep' => 'Sueno',
            'avgSleepHours' => 'h promedio',
            'exercise' => 'Ejercicio',
            'food' => 'Alimentacion',
            'leisure' => 'Ocio',
            'daysAchieved' => 'dias cumplidos',
            'trends' => 'Tendencias',
            'sleepChart' => 'Sueno',
            'profile' => 'Perfil',
            'goals' => 'Objetivos',
            'dailyRatings' => 'Valoraciones diarias (1-5)',
            'sleepHoursPerDay' => 'Horas de sueno por dia',
            'wellnessProfile' => 'Perfil de bienestar promedio',
            'goalsCompletion' => 'Cumplimiento de objetivos (%)',
            'average' => 'Promedio',
            'maximum' => 'Maximo',
            'minimum' => 'Minimo',
            'quickView' => 'Vista rapida',
            'noRecord' => 'Sin registro para el',
            'createRecord' => 'Crear registro',
            'editRecord' => 'Editar registro',
            'close' => 'Cerrar',
            'mood' => 'Estado de animo',
            'mentalState' => 'Estado mental',
            'physicalState' => 'Estado fisico',
            'sleep' => 'Sueno',
            'sleepQuality' => 'Calidad del sueno',
            'sleepHours' => 'Horas de sueno',
            'sleepHoursLabel' => 'Horas de sueno',
            'dailyGoals' => 'Objetivos del dia',
            'completedGoals' => 'Objetivos completados',
            'foodGoal' => 'Alimentacion saludable',
            'exerciseGoal' => 'Ejercicio realizado',
            'leisureGoal' => 'Tiempo de ocio / descanso',
            'exercisePlaceholder' => 'Ej: Correr, yoga, gym...',
            'leisurePlaceholder' => 'Ej: Leer, pasear, videojuegos...',
            'exerciseDetail' => 'Ejercicio',
            'leisureDetail' => 'Ocio',
            'notes' => 'Notas',
            'notesDetail' => 'Notas',
            'notesPlaceholder' => 'Algo mas que quieras anotar hoy?',
            'save' => 'Guardar registro',
            'deleteRecord' => 'Eliminar registro',
            'minutes' => 'minutos',
            'moodLabels' => ['', 'Muy mal', 'Mal', 'Normal', 'Bien', 'Excelente'],
            'chartMood' => 'Animo',
            'chartMental' => 'Mental',
            'chartPhysical' => 'Fisico',
            'chartSleep' => 'Sueno',
            'chartHours' => 'Horas',
            'chartCompletion' => 'Cumplimiento',
        ],
        'en' => [
            'appName' => 'Wellness', 'appSubtitle' => 'Wellness calendar', 'today' => 'Today', 'manageUsers' => 'User management', 'logout' => 'Sign out', 'dailyLog' => 'Daily log', 'howAreYou' => 'How are you feeling?', 'monthSummary' => 'Month summary', 'monthCharts' => 'Month charts', 'language' => 'Language', 'darkMode' => 'Dark mode', 'lightMode' => 'Light mode', 'legendBad' => 'Very bad', 'legendNormal' => 'Normal', 'legendGreat' => 'Excellent', 'legendGoal' => 'Goal', 'weekdays' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 'avgMood' => 'Average mood', 'avgMental' => 'Mental state', 'avgPhysical' => 'Physical state', 'avgSleep' => 'Sleep', 'avgSleepHours' => 'h average', 'exercise' => 'Exercise', 'food' => 'Nutrition', 'leisure' => 'Leisure', 'daysAchieved' => 'days achieved', 'trends' => 'Trends', 'sleepChart' => 'Sleep', 'profile' => 'Profile', 'goals' => 'Goals', 'dailyRatings' => 'Daily ratings (1-5)', 'sleepHoursPerDay' => 'Sleep hours per day', 'wellnessProfile' => 'Average wellness profile', 'goalsCompletion' => 'Goals completion (%)', 'average' => 'Average', 'maximum' => 'Maximum', 'minimum' => 'Minimum', 'quickView' => 'Quick view', 'noRecord' => 'No record for', 'createRecord' => 'Create record', 'editRecord' => 'Edit record', 'close' => 'Close', 'mood' => 'Mood', 'mentalState' => 'Mental state', 'physicalState' => 'Physical state', 'sleep' => 'Sleep', 'sleepQuality' => 'Sleep quality', 'sleepHours' => 'Sleep hours', 'sleepHoursLabel' => 'Sleep hours', 'dailyGoals' => 'Goals of the day', 'completedGoals' => 'Completed goals', 'foodGoal' => 'Healthy nutrition', 'exerciseGoal' => 'Exercise done', 'leisureGoal' => 'Leisure / rest time', 'exercisePlaceholder' => 'Ex: Running, yoga, gym...', 'leisurePlaceholder' => 'Ex: Reading, walking, videogames...', 'exerciseDetail' => 'Exercise', 'leisureDetail' => 'Leisure', 'notes' => 'Notes', 'notesDetail' => 'Notes', 'notesPlaceholder' => 'Anything else to note today?', 'save' => 'Save record', 'deleteRecord' => 'Delete record', 'minutes' => 'minutes', 'moodLabels' => ['', 'Very bad', 'Bad', 'Normal', 'Good', 'Excellent'], 'chartMood' => 'Mood', 'chartMental' => 'Mental', 'chartPhysical' => 'Physical', 'chartSleep' => 'Sleep', 'chartHours' => 'Hours', 'chartCompletion' => 'Completion'
        ],
        'fr' => [
            'appName' => 'Sante', 'appSubtitle' => 'Calendrier de bien-etre', 'today' => 'Aujourd hui', 'manageUsers' => 'Gestion des utilisateurs', 'logout' => 'Se deconnecter', 'dailyLog' => 'Journal quotidien', 'howAreYou' => 'Comment vous sentez-vous ?', 'monthSummary' => 'Resume du mois', 'monthCharts' => 'Graphiques du mois', 'language' => 'Langue', 'darkMode' => 'Mode sombre', 'lightMode' => 'Mode clair', 'legendBad' => 'Tres mauvais', 'legendNormal' => 'Normal', 'legendGreat' => 'Excellent', 'legendGoal' => 'Objectif', 'weekdays' => ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], 'avgMood' => 'Humeur moyenne', 'avgMental' => 'Etat mental', 'avgPhysical' => 'Etat physique', 'avgSleep' => 'Sommeil', 'avgSleepHours' => 'h moyenne', 'exercise' => 'Exercice', 'food' => 'Alimentation', 'leisure' => 'Loisir', 'daysAchieved' => 'jours atteints', 'trends' => 'Tendances', 'sleepChart' => 'Sommeil', 'profile' => 'Profil', 'goals' => 'Objectifs', 'dailyRatings' => 'Evaluations quotidiennes (1-5)', 'sleepHoursPerDay' => 'Heures de sommeil par jour', 'wellnessProfile' => 'Profil de bien-etre moyen', 'goalsCompletion' => 'Objectifs atteints (%)', 'average' => 'Moyenne', 'maximum' => 'Maximum', 'minimum' => 'Minimum', 'quickView' => 'Vue rapide', 'noRecord' => 'Aucun enregistrement pour', 'createRecord' => 'Creer enregistrement', 'editRecord' => 'Modifier enregistrement', 'close' => 'Fermer', 'mood' => 'Humeur', 'mentalState' => 'Etat mental', 'physicalState' => 'Etat physique', 'sleep' => 'Sommeil', 'sleepQuality' => 'Qualite du sommeil', 'sleepHours' => 'Heures de sommeil', 'sleepHoursLabel' => 'Heures de sommeil', 'dailyGoals' => 'Objectifs du jour', 'completedGoals' => 'Objectifs completes', 'foodGoal' => 'Alimentation saine', 'exerciseGoal' => 'Exercice realise', 'leisureGoal' => 'Temps libre / repos', 'exercisePlaceholder' => 'Ex : Course, yoga, salle...', 'leisurePlaceholder' => 'Ex : Lire, marcher, jeux video...', 'exerciseDetail' => 'Exercice', 'leisureDetail' => 'Loisir', 'notes' => 'Notes', 'notesDetail' => 'Notes', 'notesPlaceholder' => 'Quelque chose a noter aujourd hui ?', 'save' => 'Enregistrer', 'deleteRecord' => 'Supprimer le journal', 'minutes' => 'minutes', 'moodLabels' => ['', 'Tres mauvais', 'Mauvais', 'Normal', 'Bien', 'Excellent'], 'chartMood' => 'Humeur', 'chartMental' => 'Mental', 'chartPhysical' => 'Physique', 'chartSleep' => 'Sommeil', 'chartHours' => 'Heures', 'chartCompletion' => 'Completion'
        ],
        'ru' => [
            'appName' => 'Zdorove', 'appSubtitle' => 'Kalendar blagopoluchiya', 'today' => 'Segodnya', 'manageUsers' => 'Upravlenie polzovatelyami', 'logout' => 'Vyiti', 'dailyLog' => 'Dnevnik', 'howAreYou' => 'Kak vy sebya chuvstvuete?', 'monthSummary' => 'Itogi mesyatsa', 'monthCharts' => 'Grafiki mesyatsa', 'language' => 'Yazyk', 'darkMode' => 'Temnaya tema', 'lightMode' => 'Svetlaya tema', 'legendBad' => 'Ochen ploho', 'legendNormal' => 'Normalno', 'legendGreat' => 'Otlichno', 'legendGoal' => 'Tsel', 'weekdays' => ['Pn', 'Vt', 'Sr', 'Cht', 'Pt', 'Sb', 'Vs'], 'avgMood' => 'Srednee nastroenie', 'avgMental' => 'Psihicheskoe sostoyanie', 'avgPhysical' => 'Fizicheskoe sostoyanie', 'avgSleep' => 'Son', 'avgSleepHours' => 'ch v srednem', 'exercise' => 'Uprazhneniya', 'food' => 'Pitanie', 'leisure' => 'Otdyh', 'daysAchieved' => 'dnei vypolneno', 'trends' => 'Trendy', 'sleepChart' => 'Son', 'profile' => 'Profil', 'goals' => 'Tseli', 'dailyRatings' => 'Dnevnye otsenki (1-5)', 'sleepHoursPerDay' => 'Chasy sna po dnyam', 'wellnessProfile' => 'Srednii profil blagopoluchiya', 'goalsCompletion' => 'Vypolnenie tselei (%)', 'average' => 'Srednee', 'maximum' => 'Maksimum', 'minimum' => 'Minimum', 'quickView' => 'Bystryi prosmotr', 'noRecord' => 'Net zapisi za', 'createRecord' => 'Sozdat zapis', 'editRecord' => 'Izmenit zapis', 'close' => 'Zakryt', 'mood' => 'Nastroenie', 'mentalState' => 'Psihicheskoe sostoyanie', 'physicalState' => 'Fizicheskoe sostoyanie', 'sleep' => 'Son', 'sleepQuality' => 'Kachestvo sna', 'sleepHours' => 'Chasy sna', 'sleepHoursLabel' => 'Chasy sna', 'dailyGoals' => 'Tseli na den', 'completedGoals' => 'Vypolnennye tseli', 'foodGoal' => 'Poleznoe pitanie', 'exerciseGoal' => 'Sdelano uprazhnenie', 'leisureGoal' => 'Vremya otdykha', 'exercisePlaceholder' => 'Naprimer: beg, yoga, zal...', 'leisurePlaceholder' => 'Naprimer: chtenie, progulka, igry...', 'exerciseDetail' => 'Uprazhnenie', 'leisureDetail' => 'Otdyh', 'notes' => 'Zametki', 'notesDetail' => 'Zametki', 'notesPlaceholder' => 'Chto eshche hotite zapisat segodnya?', 'save' => 'Sohranit zapis', 'deleteRecord' => 'Udalit zapis', 'minutes' => 'minut', 'moodLabels' => ['', 'Ochen ploho', 'Ploho', 'Normalno', 'Horosho', 'Otlichno'], 'chartMood' => 'Nastroenie', 'chartMental' => 'Mental', 'chartPhysical' => 'Physical', 'chartSleep' => 'Son', 'chartHours' => 'Chasy', 'chartCompletion' => 'Vypolnenie'
        ],
    ];

    return $translations[$locale] ?? $translations['es'];
}

function localized_month_label(string $month, string $locale): string
{
    $labels = [
        'es' => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'fr' => ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
        'ru' => ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'Mai', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
    ];
    [$year, $number] = explode('-', $month);
    $months = $labels[$locale] ?? $labels['es'];
    $label = $months[((int) $number) - 1] . ' ' . $year;
    return strtoupper(substr($label, 0, 1)) . substr($label, 1);
}

function localized_date_label(string $date, string $locale): string
{
    $weekdays = [
        'es' => ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
        'en' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'fr' => ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        'ru' => ['Voskresene', 'Ponedelnik', 'Vtornik', 'Sreda', 'Chetverg', 'Pyatnitsa', 'Subbota'],
    ];
    $months = [
        'es' => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
        'en' => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        'fr' => ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'],
        'ru' => ['yanvarya', 'fevralya', 'marta', 'aprelya', 'maya', 'iyunya', 'iyulya', 'avgusta', 'sentyabrya', 'oktyabrya', 'noyabrya', 'dekabrya'],
    ];
    $timestamp = strtotime($date);
    $weekdaySet = $weekdays[$locale] ?? $weekdays['es'];
    $monthSet = $months[$locale] ?? $months['es'];
    return $weekdaySet[(int) date('w', $timestamp)] . ' ' . date('j', $timestamp) . ' ' . $monthSet[((int) date('n', $timestamp)) - 1] . ' ' . date('Y', $timestamp);
}

function mood_surface_class(int $mood): string
{
    if ($mood <= 2) {
        return 'calendar-cell--bad';
    }
    if ($mood === 3) {
        return 'calendar-cell--normal';
    }
    return 'calendar-cell--good';
}

function sleep_hours_max(array $entries): string
{
    if ($entries === []) {
        return '0';
    }
    $values = array_map(static function (array $entry): float {
        return (float) ($entry['sleep_hours'] ?? 0);
    }, $entries);
    return number_format(max($values), 1);
}

function sleep_hours_min(array $entries): string
{
    if ($entries === []) {
        return '0';
    }
    $values = array_map(static function (array $entry): float {
        return (float) ($entry['sleep_hours'] ?? 0);
    }, $entries);
    return number_format(min($values), 1);
}

function dashboard_icon(string $name): string
{
    if ($name === 'sun') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'moon') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.3A8.6 8.6 0 0 1 9.7 3.8a8.9 8.9 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'language') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h7M7.5 5c0 6-3 10-5 12M10 17c-2.5-2.2-4.5-5.4-5.5-9M13 19l4-11 4 11M14.2 15.5h5.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'close') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'mail') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m5 7 7 6 7-6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'users') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a4.5 4.5 0 0 1 9 0M13.5 19a3.5 3.5 0 0 1 7 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'shield') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 7.7 7 10 4.1-2.3 7-5.4 7-10V6l-7-3Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8"/></svg>';
    }

    if ($name === 'user') {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/></svg>';
    }

    return '';
}

function day_rating_group(string $label, string $name, int $selected, array $labels, array $emojis, string $accent): string
{
    $html = '<div class="day-rating-group"><div class="day-rating-group__head"><span>' . h($label) . '</span><strong>' . h((string) ($labels[$selected] ?? '')) . '</strong></div><div class="day-rating-grid">';
    for ($i = 1; $i <= 5; $i++) {
        $active = $selected === $i ? ' is-active is-' . $accent : '';
        $html .= '<label class="day-rating-card' . $active . '"><input type="radio" name="' . h($name) . '" value="' . $i . '"' . ($selected === $i ? ' checked' : '') . '><span class="day-rating-card__emoji">' . $emojis[$i - 1] . '</span><span class="day-rating-card__label">' . h((string) ($labels[$i] ?? $i)) . '</span></label>';
    }
    $html .= '</div></div>';
    return $html;
}

function day_goal_toggle(string $label, string $name, bool $checked, string $emoji, string $accent): string
{
    return '<label class="day-goal-card' . ($checked ? ' is-active is-' . $accent : '') . '"><input type="checkbox" name="' . h($name) . '" value="1"' . ($checked ? ' checked' : '') . '><span class="day-goal-card__emoji">' . $emoji . '</span><span class="day-goal-card__label">' . h($label) . '</span></label>';
}

function admin_stat_card(string $label, string $value, string $icon): string
{
    return '<article class="admin-stat-card"><div class="admin-stat-card__head"><span class="admin-stat-card__icon">' . $icon . '</span><span>' . h($label) . '</span></div><strong>' . h($value) . '</strong></article>';
}

function show_day(PDO $pdo, string $date): void
{
    $user = require_auth($pdo);
    $locale = dashboard_locale((string) ($user['preferred_locale'] ?? 'es'));
    $dictionary = dashboard_dictionary($locale);
    $statement = $pdo->prepare('SELECT * FROM daily_entries WHERE user_id = :user_id AND date_key = :date_key LIMIT 1');
    $statement->execute(['user_id' => $user['id'], 'date_key' => $date]);
    $entry = $statement->fetch() ?: null;

    ob_start();
    echo '<div class="shell day-shell"><div class="day-backdrop">';
    echo '<form method="post" action="/day/' . h($date) . '" class="day-form-layout">';
    echo csrf_input();
    echo '<section class="card day-hero">';
    echo '<a class="day-back-link" href="/?month=' . h(substr($date, 0, 7)) . '">&larr;</a>';
    echo '<div class="day-hero__copy"><h1 class="title day-hero__title">' . h($dictionary['dailyLog']) . '</h1><p class="subtitle day-hero__subtitle">' . h(localized_date_label($date, $locale)) . '</p></div>';
    echo '</section>';

    echo '<section class="card day-section">';
    echo '<h2 class="day-section__title">' . h($dictionary['howAreYou']) . '</h2>';
    echo day_rating_group($dictionary['mood'], 'mood', (int) ($entry['mood'] ?? 3), $dictionary['moodLabels'], ['😞', '🙁', '😐', '🙂', '😄'], 'emerald');
    echo day_rating_group($dictionary['mentalState'], 'mental_state', (int) ($entry['mental_state'] ?? 3), $dictionary['moodLabels'], ['😞', '🙁', '😐', '🙂', '😄'], 'emerald');
    echo day_rating_group($dictionary['physicalState'], 'physical_state', (int) ($entry['physical_state'] ?? 3), $dictionary['moodLabels'], ['🥀', '😮‍💨', '🙂', '💪', '⚡'], 'amber');
    echo '</section>';

    echo '<section class="card day-section">';
    echo '<h2 class="day-section__title">' . h($dictionary['sleep']) . '</h2>';
    echo day_rating_group($dictionary['sleepQuality'], 'sleep_quality', (int) ($entry['sleep_quality'] ?? 3), $dictionary['moodLabels'], ['😫', '😴', '😐', '😊', '🌟'], 'emerald');
    echo '<label class="day-sleep-card"><span>' . h($dictionary['sleepHours']) . '</span><div class="day-sleep-card__value"><input class="day-hours-input" type="number" step="0.1" name="sleep_hours" value="' . h((string) ($entry['sleep_hours'] ?? 7)) . '" required><strong>h</strong></div></label>';
    echo '</section>';

    echo '<section class="card day-section">';
    echo '<h2 class="day-section__title">' . h($dictionary['dailyGoals']) . '</h2>';
    echo '<div class="day-goals-grid">';
    echo day_goal_toggle($dictionary['foodGoal'], 'nutrition_done', !empty($entry['nutrition_done']), '🍽️', 'emerald');
    echo day_goal_toggle($dictionary['exerciseGoal'], 'exercise_done', !empty($entry['exercise_done']), '🏃', 'amber');
    echo day_goal_toggle($dictionary['leisureGoal'], 'leisure_done', !empty($entry['leisure_done']), '🎨', 'sky');
    echo '</div>';
    echo '<div class="day-detail-stack">';
    echo '<div class="day-detail-panel day-detail-panel--exercise"><input class="field" type="text" name="exercise_type" placeholder="' . h($dictionary['exercisePlaceholder']) . '" value="' . h((string) ($entry['exercise_type'] ?? '')) . '"><div class="day-inline-number"><input class="field" type="number" name="exercise_minutes" value="' . h((string) ($entry['exercise_minutes'] ?? 30)) . '"><span>' . h($dictionary['minutes']) . '</span></div></div>';
    echo '<div class="day-detail-panel day-detail-panel--leisure"><input class="field" type="text" name="leisure_activity" placeholder="' . h($dictionary['leisurePlaceholder']) . '" value="' . h((string) ($entry['leisure_activity'] ?? '')) . '"></div>';
    echo '</div>';
    echo '</section>';

    echo '<section class="card day-section">';
    echo '<h2 class="day-section__title">' . h($dictionary['notes']) . '</h2>';
    echo '<textarea class="textarea day-notes" name="notes" placeholder="' . h($dictionary['notesPlaceholder']) . '">' . h((string) ($entry['notes'] ?? '')) . '</textarea>';
    echo '</section>';

    echo '<div class="day-action-stack">';
    echo '<button class="primary-button day-primary-button" type="submit">' . h($dictionary['save']) . '</button>';
    if ($entry) {
        echo '<button class="day-delete-button" type="submit" name="delete_entry" value="1">' . h($dictionary['deleteRecord']) . '</button>';
    }
    echo '</div>';
    echo '</form></div></div>';
    render_page($dictionary['dailyLog'], ob_get_clean());
}

function handle_day(PDO $pdo, string $date): void
{
    $user = require_auth($pdo);

    if (post('delete_entry') === '1') {
        $statement = $pdo->prepare('DELETE FROM daily_entries WHERE user_id = :user_id AND date_key = :date_key');
        $statement->execute(['user_id' => $user['id'], 'date_key' => $date]);
        flash('success', 'Registro eliminado correctamente.');
        redirect('/?month=' . substr($date, 0, 7));
    }

    $payload = [
        'mood' => (int) post('mood', 3),
        'mental_state' => (int) post('mental_state', 3),
        'physical_state' => (int) post('physical_state', 3),
        'sleep_quality' => (int) post('sleep_quality', 3),
        'sleep_hours' => (float) post('sleep_hours', 7),
        'nutrition_done' => post('nutrition_done') ? 1 : 0,
        'exercise_done' => post('exercise_done') ? 1 : 0,
        'exercise_type' => trim((string) post('exercise_type')) ?: null,
        'exercise_minutes' => post('exercise_minutes') !== '' ? (int) post('exercise_minutes') : null,
        'leisure_done' => post('leisure_done') ? 1 : 0,
        'leisure_activity' => trim((string) post('leisure_activity')) ?: null,
        'notes' => trim((string) post('notes')) ?: null,
    ];

    $statement = $pdo->prepare('SELECT id FROM daily_entries WHERE user_id = :user_id AND date_key = :date_key LIMIT 1');
    $statement->execute(['user_id' => $user['id'], 'date_key' => $date]);
    $existingId = $statement->fetchColumn();

    if ($existingId) {
        $sql = 'UPDATE daily_entries SET mood = :mood, mental_state = :mental_state, physical_state = :physical_state, sleep_quality = :sleep_quality, sleep_hours = :sleep_hours, nutrition_done = :nutrition_done, exercise_done = :exercise_done, exercise_type = :exercise_type, exercise_minutes = :exercise_minutes, leisure_done = :leisure_done, leisure_activity = :leisure_activity, notes = :notes WHERE id = :id';
        $statement = $pdo->prepare($sql);
        $statement->execute($payload + ['id' => $existingId]);
    } else {
        $sql = 'INSERT INTO daily_entries (id, user_id, date_key, mood, mental_state, physical_state, sleep_quality, sleep_hours, nutrition_done, exercise_done, exercise_type, exercise_minutes, leisure_done, leisure_activity, notes) VALUES (:id, :user_id, :date_key, :mood, :mental_state, :physical_state, :sleep_quality, :sleep_hours, :nutrition_done, :exercise_done, :exercise_type, :exercise_minutes, :leisure_done, :leisure_activity, :notes)';
        $statement = $pdo->prepare($sql);
        $statement->execute($payload + ['id' => uuid(), 'user_id' => $user['id'], 'date_key' => $date]);
    }

    flash('success', 'Registro guardado correctamente.');
    redirect('/?month=' . substr($date, 0, 7));
}

function show_admin(PDO $pdo): void
{
    $admin = require_admin($pdo);
    $locale = dashboard_locale((string) ($admin['preferred_locale'] ?? 'es'));
    $dictionary = dashboard_dictionary($locale);
    $users = $pdo->query('SELECT * FROM users ORDER BY created_at DESC')->fetchAll();
    $invitations = $pdo->query('SELECT * FROM invitations ORDER BY created_at DESC')->fetchAll();
    $adminCount = count(array_filter($users, static function (array $item): bool {
        return ($item['role'] ?? 'user') === 'admin';
    }));

    ob_start();
    echo '<div class="shell admin-shell">';
    echo '<section class="card admin-card admin-panel">';
    echo '<div class="admin-hero">';
    echo '<div><p class="admin-kicker">Admin</p><h1 class="title admin-title">' . h($dictionary['manageUsers']) . '</h1><p class="admin-subtitle">Gestiona permisos, invitaciones y accesos desde un unico panel operativo.</p></div>';
    echo '<div class="admin-stats">';
    echo admin_stat_card('Total', (string) count($users), dashboard_icon('users'));
    echo admin_stat_card('Admins', (string) $adminCount, dashboard_icon('shield'));
    echo admin_stat_card('Invites', (string) count($invitations), dashboard_icon('mail'));
    echo '</div></div>';
    echo '<form method="post" action="/admin/users" class="admin-invite-form">';
    echo csrf_input();
    echo '<input type="hidden" name="action" value="invite">';
    echo '<input class="field" type="email" name="email" placeholder="nuevo@wellflow.local" required>';
    echo '<select class="field" name="role"><option value="user">Usuario</option><option value="admin">Administrador</option></select>';
    echo '<button class="primary-button admin-invite-button" type="submit">' . dashboard_icon('mail') . ' Crear invitacion</button>';
    echo '</form>';

    echo '<div class="admin-grid-layout">';
    echo '<section class="admin-surface">';
    echo '<h2 class="admin-section-title">Usuarios</h2>';
    echo '<div class="admin-list">';
    foreach ($users as $row) {
        echo '<article class="admin-user-card">';
        echo '<div class="admin-user-card__head"><div class="admin-user-card__identity"><span class="admin-user-card__icon">' . dashboard_icon('user') . '</span><div><strong>' . h((string) $row['name']) . '</strong><span>' . h((string) $row['email']) . '</span></div></div><span class="admin-role-pill">' . h((string) $row['role']) . '</span></div>';
        echo '<form method="post" action="/admin/users" class="admin-role-form">' . csrf_input();
        echo '<input type="hidden" name="action" value="role"><input type="hidden" name="user_id" value="' . h((string) $row['id']) . '">';
        echo '<select class="field" name="role"><option value="user"' . ($row['role'] === 'user' ? ' selected' : '') . '>Usuario</option><option value="admin"' . ($row['role'] === 'admin' ? ' selected' : '') . '>Administrador</option></select>';
        echo '<button class="secondary-button" type="submit">Guardar</button></form>';
        echo '</article>';
    }
    echo '</div></section>';

    echo '<section class="admin-surface">';
    echo '<h2 class="admin-section-title">Invitaciones</h2>';
    echo '<div class="admin-list">';
    foreach ($invitations as $row) {
        $status = $row['accepted_at'] ? 'Aceptada' : 'Pendiente';
        $inviteLink = app_url('/signup?invite=' . (string) $row['token']);
        echo '<article class="admin-invite-card">';
        echo '<div class="admin-invite-card__head"><div><strong>' . h((string) $row['email']) . '</strong><span>' . h((string) $row['role']) . '</span></div><span class="admin-status-pill' . ($status === 'Aceptada' ? ' is-ok' : ' is-pending') . '">' . h($status) . '</span></div>';
        echo '<div class="admin-invite-card__meta"><p>Token: <span class="mono">' . h((string) $row['token']) . '</span></p><p>Link: <span class="mono">' . h($inviteLink) . '</span></p></div>';
        echo '</article>';
    }
    echo '</div></section>';
    echo '</div>';
    echo '</section></div>';

    render_page($dictionary['manageUsers'], ob_get_clean());
}

function handle_admin(PDO $pdo, array $config): void
{
    $admin = require_admin($pdo);
    $action = (string) post('action');

    if ($action === 'role') {
        $userId = (string) post('user_id');
        $role = post('role') === 'admin' ? 'admin' : 'user';
        if ($userId === $admin['id'] && $role !== 'admin') {
            flash('error', 'No puedes quitarte el rol admin a ti mismo.');
            redirect('/admin/users');
        }
        $pdo->prepare('UPDATE users SET role = :role WHERE id = :id')->execute(['role' => $role, 'id' => $userId]);
        flash('success', 'Rol actualizado.');
        redirect('/admin/users');
    }

    if ($action === 'invite') {
        $email = strtolower(trim((string) post('email')));
        $role = post('role') === 'admin' ? 'admin' : 'user';
        $token = bin2hex(random_bytes(16));
        $pdo->prepare('INSERT INTO invitations (id, email, role, token, invited_by_id) VALUES (:id, :email, :role, :token, :invited_by_id)')->execute([
            'id' => uuid(),
            'email' => $email,
            'role' => $role,
            'token' => $token,
            'invited_by_id' => $admin['id'],
        ]);
        $link = app_url('/signup?invite=' . $token);

        if (!empty($config['mail']['enabled'])) {
            @mail($email, 'Invitacion a WellFlow', "Usa este enlace para crear tu cuenta:\n\n" . $link, 'From: ' . ($config['mail']['from_name'] ?? 'WellFlow') . ' <' . ($config['mail']['from'] ?? 'no-reply@example.com') . '>');
            flash('success', 'Invitacion creada y enviada.');
        } else {
            flash('success', 'Invitacion creada. Comparte este enlace: ' . $link);
        }

        redirect('/admin/users');
    }

    redirect('/admin/users');
}

function build_stats(array $entries): array
{
    $count = count($entries);
    $sumMood = 0;
    $sumMental = 0;
    $sumPhysical = 0;
    $sumSleep = 0;
    $sumSleepHours = 0.0;
    $exerciseDone = 0;
    $nutritionDone = 0;

    foreach ($entries as $entry) {
        $sumMood += (int) $entry['mood'];
        $sumMental += (int) $entry['mental_state'];
        $sumPhysical += (int) $entry['physical_state'];
        $sumSleep += (int) $entry['sleep_quality'];
        $sumSleepHours += (float) $entry['sleep_hours'];
        $exerciseDone += (int) $entry['exercise_done'];
        $nutritionDone += (int) $entry['nutrition_done'];
    }

    return [
        'avg_mood' => $count ? $sumMood / $count : 0,
        'avg_mental' => $count ? $sumMental / $count : 0,
        'avg_physical' => $count ? $sumPhysical / $count : 0,
        'avg_sleep' => $count ? $sumSleep / $count : 0,
        'avg_sleep_hours' => $count ? $sumSleepHours / $count : 0,
        'exercise_completion' => $count ? (int) round(($exerciseDone / $count) * 100) : 0,
        'nutrition_completion' => $count ? (int) round(($nutritionDone / $count) * 100) : 0,
    ];
}

function build_calendar_days(string $month): array
{
    $monthStart = new DateTimeImmutable($month . '-01');
    $start = $monthStart->modify('monday this week');
    $monthEnd = $monthStart->modify('last day of this month');
    $end = $monthEnd->modify('sunday this week');
    $days = [];
    $cursor = $start;

    while ($cursor <= $end) {
        $days[] = [
            'date' => $cursor->format('Y-m-d'),
            'day' => $cursor->format('j'),
            'current_month' => $cursor->format('Y-m') === $month,
        ];
        $cursor = $cursor->modify('+1 day');
    }

    return $days;
}

function spanish_month_label(string $month): string
{
    $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    [$year, $number] = explode('-', $month);
    return ucfirst($months[((int) $number) - 1]) . ' ' . $year;
}

function spanish_date_label(string $date): string
{
    $weekdays = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    $timestamp = strtotime($date);
    return $weekdays[(int) date('w', $timestamp)] . ' ' . date('j', $timestamp) . ' de ' . $months[((int) date('n', $timestamp)) - 1] . ' de ' . date('Y', $timestamp);
}

function mood_class(int $mood): string
{
    if ($mood <= 2) {
        return 'mood-bad';
    }
    if ($mood === 3) {
        return 'mood-normal';
    }
    return 'mood-good';
}

function legend_item(string $label, string $color): string
{
    return '<span class="legend__item"><span class="legend__swatch" style="background:' . h($color) . '"></span>' . h($label) . '</span>';
}

function stat_card(string $emoji, string $background, string $label, string $value, string $sub = ''): string
{
    return '<article class="stat-card"><div class="stat-card__icon" style="background:' . h($background) . '">' . $emoji . '</div><div><div style="color:#6a7d9f;font-size:14px">' . h($label) . '</div><div style="font-size:20px;font-weight:700;margin-top:4px">' . h($value) . '</div>' . ($sub !== '' ? '<div style="margin-top:4px;color:#6a7d9f;font-size:13px">' . h($sub) . '</div>' : '') . '</div></article>';
}

function number_field_group(string $label, string $name, int $selected): string
{
    $html = '<div class="field-group"><div class="field-head"><span>' . h($label) . '</span></div><div class="mobile-stack">';
    for ($i = 1; $i <= 5; $i++) {
        $active = $selected === $i ? ' style="border-color:rgba(102,166,255,0.8);color:white"' : '';
        $html .= '<label class="secondary-button"' . $active . '><input type="radio" name="' . h($name) . '" value="' . $i . '"' . ($selected === $i ? ' checked' : '') . ' style="display:none">' . $i . '</label>';
    }
    $html .= '</div></div>';
    return $html;
}

function checkbox_field(string $label, string $name, bool $checked): string
{
    return '<div class="field-group"><label class="field-head"><span>' . h($label) . '</span><input type="checkbox" name="' . h($name) . '" value="1"' . ($checked ? ' checked' : '') . '></label></div>';
}

function google_icon(): string
{
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.4Z" fill="#4285F4"/><path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.7-1.7-5.5-4H3.2A10 10 0 0 0 12 22Z" fill="#34A853"/><path d="M6.5 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2V7.3H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.7L6.5 14Z" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.9 9.9 0 0 0 12 2a10 10 0 0 0-8.8 5.3L6.5 10c.8-2.3 2.9-4 5.5-4Z" fill="#EA4335"/></svg>';
}

function facebook_icon(): string
{
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.3A12 12 0 0 0 24 12Z" fill="#1877F2"/></svg>';
}

function instagram_icon(): string
{
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ig-grad" x1="0%" x2="100%" y1="100%" y2="0%"><stop offset="0%" stop-color="#f58529"/><stop offset="35%" stop-color="#feda77"/><stop offset="60%" stop-color="#dd2a7b"/><stop offset="85%" stop-color="#8134af"/><stop offset="100%" stop-color="#515bd4"/></linearGradient></defs><rect width="18" height="18" x="3" y="3" rx="5" fill="url(#ig-grad)"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.1" cy="6.9" r="1.1" fill="#fff"/></svg>';
}

function linkedin_icon(): string
{
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45H16.9v-5.57c0-1.33-.02-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95v5.67H9.34V9h3.4v1.56h.05c.47-.9 1.63-1.86 3.35-1.86 3.58 0 4.24 2.36 4.24 5.43v6.32ZM5.34 7.43A2.06 2.06 0 1 1 5.34 3.3a2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.72v20.56C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" fill="#0A66C2"/></svg>';
}

function start_oauth(array $config): void
{
    $provider = normalize_provider((string) query_param('provider', ''));
    if ($provider === null) {
        flash('error', 'Proveedor OAuth no valido.');
        redirect('/login');
    }

    $providerConfig = oauth_provider_config($config, $provider);
    if ($providerConfig === null || empty($providerConfig['enabled'])) {
        flash('error', 'El acceso con ' . ucfirst($provider) . ' no esta disponible ahora mismo.');
        redirect('/login');
    }

    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;
    $_SESSION['oauth_provider'] = $provider;

    redirect(oauth_authorization_url($provider, $providerConfig, $state));
}

function handle_oauth_callback(PDO $pdo, array $config): void
{
    $provider = normalize_provider((string) query_param('provider', ''));
    $state = (string) query_param('state', '');
    $code = (string) query_param('code', '');
    $error = (string) query_param('error', '');

    if ($error !== '') {
        flash('error', 'El proveedor ha cancelado o rechazado el acceso social.');
        redirect('/login');
    }

    if ($provider === null || $provider !== ($_SESSION['oauth_provider'] ?? null) || !hash_equals((string) ($_SESSION['oauth_state'] ?? ''), $state)) {
        flash('error', 'Respuesta OAuth invalida.');
        redirect('/login');
    }

    $providerConfig = oauth_provider_config($config, $provider);
    if ($providerConfig === null || empty($providerConfig['enabled'])) {
        flash('error', 'El proveedor OAuth no esta configurado.');
        redirect('/login');
    }

    unset($_SESSION['oauth_state'], $_SESSION['oauth_provider']);

    try {
        $token = oauth_exchange_code($provider, $providerConfig, $code);
        $profile = oauth_fetch_profile($provider, $token);
        $user = resolve_oauth_user($pdo, $provider, $profile);
        $_SESSION['user_id'] = $user['id'];
        setcookie('wellflow-theme', (string) $user['theme_mode'], time() + 31536000, '/');
        flash('success', 'Acceso social completado correctamente.');
        redirect('/');
    } catch (RuntimeException $exception) {
        flash('error', $exception->getMessage());
        redirect('/login');
    }
}

function normalize_provider(string $provider): ?string
{
    $provider = strtolower(trim($provider));
    return in_array($provider, ['google', 'facebook', 'linkedin', 'instagram'], true) ? $provider : null;
}

function oauth_provider_config(array $config, string $provider): ?array
{
    return $config['oauth'][$provider] ?? null;
}

function oauth_authorization_url(string $provider, array $providerConfig, string $state): string
{
    $params = [];

    if ($provider === 'google') {
        $params = [
            'client_id' => $providerConfig['client_id'],
            'redirect_uri' => $providerConfig['redirect_uri'],
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'access_type' => 'online',
            'prompt' => 'select_account',
        ];
        return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
    }

    if ($provider === 'facebook') {
        $params = [
            'client_id' => $providerConfig['client_id'],
            'redirect_uri' => $providerConfig['redirect_uri'],
            'response_type' => 'code',
            'scope' => 'email,public_profile',
            'state' => $state,
        ];
        return 'https://www.facebook.com/v19.0/dialog/oauth?' . http_build_query($params);
    }

    if ($provider === 'linkedin') {
        $params = [
            'response_type' => 'code',
            'client_id' => $providerConfig['client_id'],
            'redirect_uri' => $providerConfig['redirect_uri'],
            'state' => $state,
            'scope' => 'openid profile email',
        ];
        return 'https://www.linkedin.com/oauth/v2/authorization?' . http_build_query($params);
    }

    if ($provider === 'instagram') {
        throw new RuntimeException('Instagram requiere una configuracion Meta especifica. Activalo solo si tienes el producto adecuado habilitado.');
    }

    throw new RuntimeException('Proveedor OAuth no soportado.');
}

function oauth_exchange_code(string $provider, array $providerConfig, string $code): array
{
    if ($code === '') {
        throw new RuntimeException('No se ha recibido codigo de autorizacion del proveedor.');
    }

    if ($provider === 'google') {
        return oauth_post_form('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => $providerConfig['client_id'],
            'client_secret' => $providerConfig['client_secret'],
            'redirect_uri' => $providerConfig['redirect_uri'],
            'grant_type' => 'authorization_code',
        ]);
    }

    if ($provider === 'facebook') {
        return oauth_get_json('https://graph.facebook.com/v19.0/oauth/access_token?' . http_build_query([
            'client_id' => $providerConfig['client_id'],
            'client_secret' => $providerConfig['client_secret'],
            'redirect_uri' => $providerConfig['redirect_uri'],
            'code' => $code,
        ]));
    }

    if ($provider === 'linkedin') {
        return oauth_post_form('https://www.linkedin.com/oauth/v2/accessToken', [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => $providerConfig['client_id'],
            'client_secret' => $providerConfig['client_secret'],
            'redirect_uri' => $providerConfig['redirect_uri'],
        ]);
    }

    throw new RuntimeException('Proveedor OAuth no soportado para intercambio de codigo.');
}

function oauth_fetch_profile(string $provider, array $token): array
{
    $accessToken = $token['access_token'] ?? null;
    if (!$accessToken) {
        throw new RuntimeException('El proveedor no devolvio access token.');
    }

    if ($provider === 'google') {
        $profile = oauth_get_json('https://openidconnect.googleapis.com/v1/userinfo', [
            'Authorization: Bearer ' . $accessToken,
        ]);
        return [
            'provider_account_id' => (string) ($profile['sub'] ?? ''),
            'email' => strtolower((string) ($profile['email'] ?? '')),
            'name' => (string) ($profile['name'] ?? 'Usuario Google'),
        ];
    }

    if ($provider === 'facebook') {
        $profile = oauth_get_json('https://graph.facebook.com/me?' . http_build_query([
            'fields' => 'id,name,email',
            'access_token' => $accessToken,
        ]));
        return [
            'provider_account_id' => (string) ($profile['id'] ?? ''),
            'email' => strtolower((string) ($profile['email'] ?? '')),
            'name' => (string) ($profile['name'] ?? 'Usuario Facebook'),
        ];
    }

    if ($provider === 'linkedin') {
        $profile = oauth_get_json('https://api.linkedin.com/v2/userinfo', [
            'Authorization: Bearer ' . $accessToken,
        ]);
        return [
            'provider_account_id' => (string) ($profile['sub'] ?? ''),
            'email' => strtolower((string) ($profile['email'] ?? '')),
            'name' => (string) ($profile['name'] ?? 'Usuario LinkedIn'),
        ];
    }

    throw new RuntimeException('Proveedor OAuth no soportado para perfil.');
}

function resolve_oauth_user(PDO $pdo, string $provider, array $profile): array
{
    $providerAccountId = trim((string) ($profile['provider_account_id'] ?? ''));
    $email = strtolower(trim((string) ($profile['email'] ?? '')));
    $name = trim((string) ($profile['name'] ?? 'Usuario'));

    if ($providerAccountId === '' || $email === '') {
        throw new RuntimeException('El proveedor no devolvio un email valido.');
    }

    $statement = $pdo->prepare('SELECT u.* FROM social_accounts sa INNER JOIN users u ON u.id = sa.user_id WHERE sa.provider = :provider AND sa.provider_account_id = :provider_account_id LIMIT 1');
    $statement->execute([
        'provider' => $provider,
        'provider_account_id' => $providerAccountId,
    ]);
    $linkedUser = $statement->fetch();
    if ($linkedUser) {
        return $linkedUser;
    }

    $statement = $pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => $email]);
    $user = $statement->fetch() ?: null;

    if ($user) {
        link_social_account($pdo, $user['id'], $provider, $providerAccountId);
        return $user;
    }

    $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $role = 'user';

    if ($userCount === 0) {
        $role = 'admin';
    } else {
        $statement = $pdo->prepare('SELECT * FROM invitations WHERE email = :email AND accepted_at IS NULL ORDER BY created_at DESC LIMIT 1');
        $statement->execute(['email' => $email]);
        $invitation = $statement->fetch() ?: null;
        if (!$invitation) {
            throw new RuntimeException('No existe invitacion valida para este email. Contacta con un administrador.');
        }
        $role = (string) $invitation['role'];
        $pdo->prepare('UPDATE invitations SET accepted_at = NOW() WHERE id = :id')->execute(['id' => $invitation['id']]);
    }

    $userId = uuid();
    $statement = $pdo->prepare('INSERT INTO users (id, email, name, password_hash, role, preferred_locale, theme_mode) VALUES (:id, :email, :name, :password_hash, :role, :preferred_locale, :theme_mode)');
    $statement->execute([
        'id' => $userId,
        'email' => $email,
        'name' => $name,
        'password_hash' => password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT),
        'role' => $role,
        'preferred_locale' => 'es',
        'theme_mode' => 'dark',
    ]);
    link_social_account($pdo, $userId, $provider, $providerAccountId);

    $statement = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
    $statement->execute(['id' => $userId]);
    return $statement->fetch() ?: throw new RuntimeException('No se pudo cargar el usuario despues del alta social.');
}

function link_social_account(PDO $pdo, string $userId, string $provider, string $providerAccountId): void
{
    $statement = $pdo->prepare('SELECT id FROM social_accounts WHERE provider = :provider AND provider_account_id = :provider_account_id LIMIT 1');
    $statement->execute([
        'provider' => $provider,
        'provider_account_id' => $providerAccountId,
    ]);
    if ($statement->fetchColumn()) {
        return;
    }

    $pdo->prepare('INSERT INTO social_accounts (id, user_id, provider, provider_account_id) VALUES (:id, :user_id, :provider, :provider_account_id)')->execute([
        'id' => uuid(),
        'user_id' => $userId,
        'provider' => $provider,
        'provider_account_id' => $providerAccountId,
    ]);
}

function oauth_post_form(string $url, array $data): array
{
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n",
            'content' => http_build_query($data),
            'ignore_errors' => true,
            'timeout' => 20,
        ],
    ];

    $response = file_get_contents($url, false, stream_context_create($options));
    if ($response === false) {
        throw new RuntimeException('No se pudo completar la llamada OAuth.');
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Respuesta OAuth invalida.');
    }

    if (!empty($decoded['error'])) {
        throw new RuntimeException('Error OAuth: ' . (is_array($decoded['error']) ? json_encode($decoded['error']) : (string) $decoded['error']));
    }

    return $decoded;
}

function oauth_get_json(string $url, array $headers = []): array
{
    $headerLines = array_merge(['Accept: application/json'], $headers);
    $options = [
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headerLines) . "\r\n",
            'ignore_errors' => true,
            'timeout' => 20,
        ],
    ];

    $response = file_get_contents($url, false, stream_context_create($options));
    if ($response === false) {
        throw new RuntimeException('No se pudo recuperar informacion del proveedor social.');
    }

    $decoded = json_decode($response, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('La respuesta del proveedor no es JSON valido.');
    }

    if (!empty($decoded['error'])) {
        $error = $decoded['error'];
        $message = is_array($error) ? ($error['message'] ?? json_encode($error)) : (string) $error;
        throw new RuntimeException('Error OAuth: ' . $message);
    }

    return $decoded;
}

function build_chart_payload(array $entries): array
{
    $labels = [];
    $mood = [];
    $mental = [];
    $physical = [];
    $sleepQuality = [];
    $sleepHours = [];
    $goals = ['nutricion' => 0, 'ejercicio' => 0, 'ocio' => 0];

    foreach ($entries as $entry) {
        $labels[] = date('d', strtotime((string) $entry['date_key']));
        $mood[] = (int) $entry['mood'];
        $mental[] = (int) $entry['mental_state'];
        $physical[] = (int) $entry['physical_state'];
        $sleepQuality[] = (int) $entry['sleep_quality'];
        $sleepHours[] = (float) $entry['sleep_hours'];
        $goals['nutricion'] += (int) $entry['nutrition_done'];
        $goals['ejercicio'] += (int) $entry['exercise_done'];
        $goals['ocio'] += (int) $entry['leisure_done'];
    }

    $count = max(1, count($entries));

    return [
        'labels' => $labels,
        'trend' => [
            'mood' => $mood,
            'mental' => $mental,
            'physical' => $physical,
            'sleep' => $sleepQuality,
        ],
        'sleepHours' => $sleepHours,
        'profile' => [
            'mood' => average_value($mood),
            'mental' => average_value($mental),
            'physical' => average_value($physical),
            'sleep' => average_value($sleepQuality),
        ],
        'goals' => [
            'labels' => ['Nutricion', 'Ejercicio', 'Ocio'],
            'values' => [
                (int) round(($goals['nutricion'] / $count) * 100),
                (int) round(($goals['ejercicio'] / $count) * 100),
                (int) round(($goals['ocio'] / $count) * 100),
            ],
        ],
    ];
}

function average_value(array $values): float
{
    if ($values === []) {
        return 0.0;
    }

    return round(array_sum($values) / count($values), 2);
}

function dashboard_chart_script(): string
{
    return <<<'JS'
(() => {
  const data = window.wellflowCharts;
    const chartLabels = window.wellflowChartLabels || {};
    const chartTitles = window.wellflowChartTitles || {};
    const quickViewText = window.wellflowQuickViewText || {};
    const charts = {};
    const tabs = Array.from(document.querySelectorAll('[data-chart-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-chart-panel]'));
    const chartTitle = document.querySelector('[data-chart-title]');
    const sleepStats = document.querySelector('[data-sleep-stats]');
    const menuRoots = Array.from(document.querySelectorAll('[data-menu]'));
    const calendarCells = Array.from(document.querySelectorAll('.calendar-cell[data-date]'));
    const quickView = document.querySelector('[data-quickview]');
    const quickViewClose = document.querySelector('[data-quickview-close]');
    const quickViewDate = document.querySelector('[data-quickview-date]');
    const quickViewBody = document.querySelector('[data-quickview-body]');

  const commonGrid = {
    color: 'rgba(169, 183, 208, 0.12)',
  };

  const commonTicks = {
    color: '#a9b7d0',
    font: {
      size: 11,
      family: 'Segoe UI, Arial, sans-serif',
    },
  };

    const activateChart = (name) => {
        tabs.forEach((tab) => {
            tab.classList.toggle('is-active', tab.dataset.chartTab === name);
        });

        panels.forEach((panel) => {
            panel.classList.toggle('is-active', panel.dataset.chartPanel === name);
        });

        if (chartTitle) {
            chartTitle.textContent = chartTitles[name] || '';
        }

        if (sleepStats) {
            sleepStats.classList.toggle('is-visible', name === 'sleep');
        }

        if (charts[name]) {
            charts[name].resize();
            charts[name].update('none');
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', (event) => {
            event.preventDefault();
            activateChart(tab.dataset.chartTab);
        });
    });

    if (data && typeof Chart !== 'undefined') {
        charts.trend = new Chart(document.getElementById('trendChart'), {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    { label: chartLabels.mood || 'Mood', data: data.trend.mood, borderColor: '#66a6ff', backgroundColor: 'rgba(102,166,255,0.15)', tension: 0.35, fill: false },
                    { label: chartLabels.mental || 'Mental', data: data.trend.mental, borderColor: '#d2b36d', backgroundColor: 'rgba(210,179,109,0.15)', tension: 0.35, fill: false },
                    { label: chartLabels.physical || 'Physical', data: data.trend.physical, borderColor: '#7be0b0', backgroundColor: 'rgba(123,224,176,0.15)', tension: 0.35, fill: false },
                    { label: chartLabels.sleep || 'Sleep', data: data.trend.sleep, borderColor: '#d6a8ff', backgroundColor: 'rgba(214,168,255,0.15)', tension: 0.35, fill: false },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 5, ticks: commonTicks, grid: commonGrid },
                    x: { ticks: commonTicks, grid: commonGrid },
                },
                plugins: { legend: { labels: { color: '#eef4ff' } } },
            },
        });

        charts.sleep = new Chart(document.getElementById('sleepChart'), {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{ label: chartLabels.hours || 'Hours', data: data.sleepHours, backgroundColor: 'rgba(102,166,255,0.55)', borderRadius: 10 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { ticks: commonTicks, grid: commonGrid },
                    x: { ticks: commonTicks, grid: commonGrid },
                },
                plugins: { legend: { labels: { color: '#eef4ff' } } },
            },
        });

        charts.profile = new Chart(document.getElementById('profileChart'), {
            type: 'radar',
            data: {
                labels: [chartLabels.mood || 'Mood', chartLabels.mental || 'Mental', chartLabels.physical || 'Physical', chartLabels.sleep || 'Sleep'],
                datasets: [{
                    label: 'Promedio mensual',
                    data: [data.profile.mood, data.profile.mental, data.profile.physical, data.profile.sleep],
                    backgroundColor: 'rgba(210,179,109,0.18)',
                    borderColor: '#d2b36d',
                    pointBackgroundColor: '#d2b36d',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        angleLines: { color: 'rgba(169,183,208,0.2)' },
                        grid: { color: 'rgba(169,183,208,0.12)' },
                        pointLabels: { color: '#eef4ff' },
                        ticks: { backdropColor: 'transparent', color: '#a9b7d0' },
                    },
                },
                plugins: { legend: { labels: { color: '#eef4ff' } } },
            },
        });

        charts.goals = new Chart(document.getElementById('goalsChart'), {
            type: 'doughnut',
            data: {
                labels: data.goals.labels,
                datasets: [{
                    data: data.goals.values,
                    backgroundColor: ['#66a6ff', '#7be0b0', '#d2b36d'],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#eef4ff' } } },
            },
        });
    }

    menuRoots.forEach((menu) => {
        const trigger = menu.querySelector('[data-menu-trigger]');
        if (!trigger) {
            return;
        }

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            const shouldOpen = !menu.classList.contains('is-open');
            menuRoots.forEach((item) => item.classList.remove('is-open'));
            if (shouldOpen) {
                menu.classList.add('is-open');
            }
        });
    });

    document.addEventListener('click', (event) => {
        menuRoots.forEach((menu) => {
            if (!menu.contains(event.target)) {
                menu.classList.remove('is-open');
            }
        });
    });

    const closeQuickView = () => {
        if (!quickView) {
            return;
        }
        quickView.hidden = true;
        document.body.style.overflow = '';
    };

    const renderQuickView = (cell) => {
        if (!quickView || !quickViewDate || !quickViewBody) {
            return;
        }

        const hasEntry = cell.dataset.hasEntry === '1';
        const dateLabel = cell.dataset.dateLabel || cell.dataset.date || '';
        const editUrl = cell.dataset.editUrl || '#';

        quickViewDate.textContent = dateLabel;

        if (hasEntry) {
            quickViewBody.innerHTML = `
                <div class="quickview-grid">
                    <div class="quickview-card"><span>${quickViewText.mood || 'Mood'}</span><strong>${cell.dataset.moodLabel || '-'}</strong></div>
                    <div class="quickview-card"><span>${quickViewText.mentalState || 'Mental state'}</span><strong>${cell.dataset.mental || '-'}</strong></div>
                    <div class="quickview-card"><span>${quickViewText.physicalState || 'Physical state'}</span><strong>${cell.dataset.physical || '-'}</strong></div>
                    <div class="quickview-card"><span>${quickViewText.sleepHoursLabel || 'Sleep hours'}</span><strong>${cell.dataset.sleepHours || '-'}</strong></div>
                </div>
                <div class="quickview-detail-grid">
                    <div class="quickview-goals">
                        <p>${quickViewText.completedGoals || 'Completed goals'}</p>
                        <div class="quickview-goal-row"><span>${quickViewText.foodGoal || 'Food'}</span><strong>${cell.dataset.nutrition || '—'}</strong></div>
                        <div class="quickview-goal-row"><span>${quickViewText.exerciseGoal || 'Exercise'}</span><strong>${cell.dataset.exercise || '—'}</strong></div>
                        <div class="quickview-goal-row"><span>${quickViewText.leisureGoal || 'Leisure'}</span><strong>${cell.dataset.leisure || '—'}</strong></div>
                    </div>
                    <div class="quickview-detail">
                        <p>${quickViewText.exerciseDetail || 'Exercise'}: ${cell.dataset.exerciseDetail || '-'}</p>
                        <p>${quickViewText.leisureDetail || 'Leisure'}: ${cell.dataset.leisureDetail || '-'}</p>
                        <p>${quickViewText.notesDetail || 'Notes'}: ${cell.dataset.notesDetail || '-'}</p>
                        <div class="quickview-actions">
                            <a class="today-button" href="${editUrl}">${quickViewText.editRecord || 'Edit record'}</a>
                            <button class="dashboard-control" type="button" data-quickview-dismiss>${quickViewText.close || 'Close'}</button>
                        </div>
                    </div>
                </div>`;
        } else {
            quickViewBody.innerHTML = `
                <div class="quickview-empty">
                    <p>${quickViewText.noRecordPrefix || 'No record for'} ${dateLabel}</p>
                    <div class="quickview-actions">
                        <a class="today-button" href="${editUrl}">${quickViewText.createRecord || 'Create record'}</a>
                        <button class="dashboard-control" type="button" data-quickview-dismiss>${quickViewText.close || 'Close'}</button>
                    </div>
                </div>`;
        }

        quickView.hidden = false;
        document.body.style.overflow = 'hidden';
    };

    calendarCells.forEach((cell) => {
        cell.addEventListener('click', () => renderQuickView(cell));
        cell.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                renderQuickView(cell);
            }
        });
    });

    document.addEventListener('click', (event) => {
        const cell = event.target.closest('.calendar-cell[data-date]');
        if (cell) {
            renderQuickView(cell);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }

        const cell = event.target.closest('.calendar-cell[data-date]');
        if (cell) {
            event.preventDefault();
            renderQuickView(cell);
        }
    });

    if (quickView) {
        quickView.addEventListener('click', (event) => {
            if (event.target === quickView || event.target.matches('[data-quickview-dismiss]')) {
                closeQuickView();
            }
        });
    }

    if (quickViewClose) {
        quickViewClose.addEventListener('click', closeQuickView);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeQuickView();
            menuRoots.forEach((menu) => menu.classList.remove('is-open'));
        }
    });

    activateChart('trend');
})();
JS;
}