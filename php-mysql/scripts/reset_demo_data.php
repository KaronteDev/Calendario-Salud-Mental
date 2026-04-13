<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "Este script solo puede ejecutarse desde CLI.\n");
    exit(1);
}

try {
    $options = parse_cli_options(array_slice($argv, 1));
} catch (InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
}

$root = dirname(__DIR__);
$configPath = $root . DIRECTORY_SEPARATOR . 'config.php';
$schemaPath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'schema.sql';
$seedPath = $root . DIRECTORY_SEPARATOR . 'database' . DIRECTORY_SEPARATOR . 'seed.sql';

if (!file_exists($configPath)) {
    fwrite(STDERR, "Falta config.php. Duplica config.php.example y completa la configuracion.\n");
    exit(1);
}

if (!file_exists($schemaPath) || !file_exists($seedPath)) {
    fwrite(STDERR, "No se encuentran schema.sql o seed.sql en la carpeta database/.\n");
    exit(1);
}

$config = require $configPath;
$db = $config['database'] ?? null;

if (!is_array($db)) {
    fwrite(STDERR, "La seccion database de config.php no es valida.\n");
    exit(1);
}

$dsn = sprintf(
    'mysql:host=%s;port=%d;dbname=%s;charset=%s',
    $db['host'] ?? 'localhost',
    (int) ($db['port'] ?? 3306),
    $db['name'] ?? '',
    $db['charset'] ?? 'utf8mb4'
);

try {
    $pdo = new PDO($dsn, (string) ($db['user'] ?? ''), (string) ($db['password'] ?? ''), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $exception) {
    fwrite(STDERR, 'No se pudo conectar a MySQL: ' . $exception->getMessage() . "\n");
    exit(1);
}

try {
    $pdo->beginTransaction();

    if ($options['fresh']) {
        foreach (drop_statements() as $statement) {
            $pdo->exec($statement);
        }
        execute_sql_file($pdo, $schemaPath);
    }

    if ($options['seed_only']) {
        clear_demo_tables($pdo);
    }

    if (!$options['seed_only'] && !$options['fresh']) {
        foreach (drop_statements() as $statement) {
            $pdo->exec($statement);
        }
        execute_sql_file($pdo, $schemaPath);
    }

    execute_sql_file($pdo, $seedPath);

    if ($options['extra_user_email'] !== null) {
        $extraUser = create_extra_demo_user(
            $pdo,
            $options['extra_user_email'],
            $options['extra_user_password'],
            $options['extra_user_role']
        );

        if ($options['extra_user_invitation']) {
            $extraInvitation = create_extra_user_invitation(
                $pdo,
                $extraUser['email'],
                $extraUser['role']
            );
        }
    }

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fwrite(STDERR, 'Error al reconstruir la base demo: ' . $exception->getMessage() . "\n");
    exit(1);
}

$users = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
$entries = (int) $pdo->query('SELECT COUNT(*) FROM daily_entries')->fetchColumn();
$invitations = (int) $pdo->query('SELECT COUNT(*) FROM invitations')->fetchColumn();

fwrite(STDOUT, "Base demo reconstruida correctamente.\n");
fwrite(STDOUT, "Usuarios: {$users}\n");
fwrite(STDOUT, "Registros diarios: {$entries}\n");
fwrite(STDOUT, "Invitaciones: {$invitations}\n\n");
fwrite(STDOUT, "Credenciales demo:\n");
fwrite(STDOUT, "- admin@wellflow.local / Admin123!\n");
fwrite(STDOUT, "- ana@wellflow.local / Demo123!\n");
fwrite(STDOUT, "- invitado@wellflow.local / Invitado123!\n");

if (isset($extraUser)) {
    fwrite(STDOUT, '- ' . $extraUser['email'] . ' / ' . $extraUser['password'] . ' (' . $extraUser['role'] . ")\n");
}

if (isset($extraInvitation)) {
    fwrite(STDOUT, "Invitacion asociada creada:\n");
    fwrite(STDOUT, '- token: ' . $extraInvitation['token'] . "\n");
    fwrite(STDOUT, "- estado: aceptada automaticamente\n");
}

function parse_cli_options(array $args): array
{
    $options = [
        'fresh' => false,
        'seed_only' => false,
        'extra_user_email' => null,
        'extra_user_password' => 'Demo123!',
        'extra_user_role' => 'user',
        'extra_user_invitation' => false,
    ];

    foreach ($args as $arg) {
        if ($arg === '--fresh') {
            $options['fresh'] = true;
            continue;
        }

        if ($arg === '--seed-only') {
            $options['seed_only'] = true;
            continue;
        }

        if (str_starts_with($arg, '--user=')) {
            $email = trim(substr($arg, strlen('--user=')));
            if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new InvalidArgumentException('El valor de --user debe ser un email valido.');
            }
            $options['extra_user_email'] = strtolower($email);
            continue;
        }

        if (str_starts_with($arg, '--password=')) {
            $password = (string) substr($arg, strlen('--password='));
            if (trim($password) === '') {
                throw new InvalidArgumentException('El valor de --password no puede estar vacio.');
            }
            $options['extra_user_password'] = $password;
            continue;
        }

        if (str_starts_with($arg, '--role=')) {
            $role = strtolower(trim((string) substr($arg, strlen('--role='))));
            if (!in_array($role, ['admin', 'user'], true)) {
                throw new InvalidArgumentException('El valor de --role debe ser admin o user.');
            }
            $options['extra_user_role'] = $role;
            continue;
        }

        if ($arg === '--with-invitation') {
            $options['extra_user_invitation'] = true;
            continue;
        }

        if (in_array($arg, ['--help', '-h'], true)) {
            print_help_and_exit();
        }

        throw new InvalidArgumentException('Opcion no reconocida: ' . $arg);
    }

    if ($options['fresh'] && $options['seed_only']) {
        throw new InvalidArgumentException('Usa --fresh o --seed-only, pero no ambos a la vez.');
    }

    if ($options['extra_user_email'] === null && ($options['extra_user_password'] !== 'Demo123!' || $options['extra_user_role'] !== 'user' || $options['extra_user_invitation'])) {
        throw new InvalidArgumentException('Las opciones --password, --role y --with-invitation requieren tambien --user=email.');
    }

    return $options;
}

function print_help_and_exit(): void
{
    $help = "Uso:\n"
        . "  php scripts/reset_demo_data.php [opciones]\n\n"
        . "Opciones:\n"
        . "  --fresh           Elimina tablas, recrea schema.sql y vuelve a cargar seed.sql\n"
        . "  --seed-only       Mantiene el schema actual, limpia datos y vuelve a cargar seed.sql\n"
        . "  --user=email      Crea un usuario demo adicional despues del seed\n"
        . "  --password=valor  Define la password del usuario extra creado con --user\n"
        . "  --role=valor      Define el rol del usuario extra: admin o user\n"
        . "  --with-invitation Crea tambien una invitacion asociada y marcada como aceptada\n"
        . "  --help, -h        Muestra esta ayuda\n\n"
        . "Sin opciones:\n"
        . "  Equivale a una reconstruccion completa de la base demo.";

    fwrite(STDOUT, $help . "\n");
    exit(0);
}

function drop_statements(): array
{
    return [
        'DROP TABLE IF EXISTS password_reset_tokens',
        'DROP TABLE IF EXISTS social_accounts',
        'DROP TABLE IF EXISTS daily_entries',
        'DROP TABLE IF EXISTS invitations',
        'DROP TABLE IF EXISTS users',
    ];
}

function clear_demo_tables(PDO $pdo): void
{
    $statements = [
        'DELETE FROM password_reset_tokens',
        'DELETE FROM social_accounts',
        'DELETE FROM daily_entries',
        'DELETE FROM invitations',
        'DELETE FROM users',
    ];

    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
}

function create_extra_demo_user(PDO $pdo, string $email, string $password, string $role): array
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
        'id' => generate_uuid_like_id(),
        'email' => $email,
        'name' => $name,
        'password_hash' => password_hash($password, PASSWORD_BCRYPT),
        'role' => $role,
        'preferred_locale' => 'es',
        'theme_mode' => 'dark',
    ]);

    return [
        'email' => $email,
        'password' => $password,
        'role' => $role,
    ];
}

function create_extra_user_invitation(PDO $pdo, string $email, string $role): array
{
    $adminId = (string) $pdo->query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")->fetchColumn();
    if ($adminId === '') {
        throw new RuntimeException('No existe usuario admin para asociar la invitacion del usuario extra.');
    }

    $token = 'invite-' . strtolower(bin2hex(random_bytes(8)));

    $statement = $pdo->prepare('INSERT INTO invitations (id, email, role, token, invited_by_id, accepted_at, sent_at, created_at) VALUES (:id, :email, :role, :token, :invited_by_id, NOW(), NOW(), NOW())');
    $statement->execute([
        'id' => generate_uuid_like_id(),
        'email' => $email,
        'role' => $role,
        'token' => $token,
        'invited_by_id' => $adminId,
    ]);

    return [
        'token' => $token,
    ];
}

function generate_uuid_like_id(): string
{
    $hex = bin2hex(random_bytes(16));
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

function execute_sql_file(PDO $pdo, string $path): void
{
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException('No se pudo leer el archivo SQL: ' . $path);
    }

    $statements = split_sql_statements($sql);
    foreach ($statements as $statement) {
        $trimmed = trim($statement);
        if ($trimmed === '') {
            continue;
        }

        $pdo->exec($trimmed);
    }
}

function split_sql_statements(string $sql): array
{
    $lines = preg_split('/\R/', $sql) ?: [];
    $buffer = '';
    $statements = [];

    foreach ($lines as $line) {
        $trimmedLine = ltrim($line);
        if ($trimmedLine === '' || str_starts_with($trimmedLine, '--')) {
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