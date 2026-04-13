<?php

$root = dirname(__DIR__);
$configFile = $root . DIRECTORY_SEPARATOR . 'config.php';

header('Content-Type: text/html; charset=utf-8');

function h_server_check($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function server_check_starts_with($value, $prefix)
{
    return substr($value, 0, strlen($prefix)) === $prefix;
}

$config = null;
$configError = null;

if (file_exists($configFile)) {
    try {
        $config = require $configFile;
    } catch (Exception $e) {
        $configError = $e->getMessage();
    } catch (Error $e) {
        $configError = $e->getMessage();
    }
} else {
    $configError = 'No existe config.php';
}

$db = is_array($config) && isset($config['database']) && is_array($config['database']) ? $config['database'] : array();
$host = isset($db['host']) ? $db['host'] : '';
$dnsResult = $host !== '' ? @gethostbynamel($host) : false;
$pdoAvailable = extension_loaded('pdo');
$pdoMysqlAvailable = extension_loaded('pdo_mysql');
$mysqliAvailable = extension_loaded('mysqli');
$pdoMessage = 'No intentado';
$pdoVersion = '';

if ($pdoAvailable && $pdoMysqlAvailable && is_array($config) && !empty($host)) {
    try {
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            isset($db['host']) ? $db['host'] : 'localhost',
            isset($db['port']) ? (int) $db['port'] : 3306,
            isset($db['name']) ? $db['name'] : '',
            isset($db['charset']) ? $db['charset'] : 'utf8mb4'
        );
        $pdo = new PDO($dsn, isset($db['user']) ? $db['user'] : '', isset($db['password']) ? $db['password'] : '', array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
        $pdoMessage = 'Conexion correcta';
        $pdoVersion = (string) $pdo->query('SELECT VERSION()')->fetchColumn();
    } catch (Exception $e) {
        $pdoMessage = $e->getMessage();
    } catch (Error $e) {
        $pdoMessage = $e->getMessage();
    }
}

$installToken = is_array($config) && isset($config['installer']['token']) ? $config['installer']['token'] : '';
$debugToken = is_array($config) && isset($config['debug']['token']) ? $config['debug']['token'] : '';
$installUrl = '/install.php' . ($installToken !== '' ? '?token=' . urlencode($installToken) : '');
$loginDebugSuffix = 'debug=1' . ($debugToken !== '' ? '&debug_token=' . urlencode($debugToken) : '');
$cleanLoginUrl = '/login?' . $loginDebugSuffix;
$directLoginUrl = '/index.php/login?' . $loginDebugSuffix;
$debugInstallUrl = '/install.php?debug=1' . ($installToken !== '' ? '&token=' . urlencode($installToken) : '') . ($debugToken !== '' ? '&debug_token=' . urlencode($debugToken) : '');

?><!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Server Check | WellFlow</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0b1730; color: #eef4ff; margin: 0; padding: 24px; }
    .wrap { max-width: 980px; margin: 0 auto; }
    .card { background: #12284f; border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 20px; margin-bottom: 18px; }
    h1, h2 { margin-top: 0; }
    .ok { color: #9be6bf; }
    .bad { color: #ffb3b3; }
    .mono { font-family: Consolas, monospace; white-space: pre-wrap; word-break: break-word; }
    a { color: #8fc0ff; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.08); vertical-align: top; }
    td:first-child { width: 240px; color: #a9b7d0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>WellFlow Server Check</h1>
      <p>Diagnostico minimo ejecutado dentro del propio hosting. Sirve para validar PHP, DNS y MariaDB aunque la app principal falle.</p>
    </div>

    <div class="card">
      <h2>Entorno PHP</h2>
      <table>
        <tr><td>PHP version</td><td class="mono"><?php echo h_server_check(PHP_VERSION); ?></td></tr>
        <tr><td>SAPI</td><td class="mono"><?php echo h_server_check(PHP_SAPI); ?></td></tr>
        <tr><td>PDO</td><td class="mono <?php echo $pdoAvailable ? 'ok' : 'bad'; ?>"><?php echo $pdoAvailable ? 'Disponible' : 'No disponible'; ?></td></tr>
        <tr><td>pdo_mysql</td><td class="mono <?php echo $pdoMysqlAvailable ? 'ok' : 'bad'; ?>"><?php echo $pdoMysqlAvailable ? 'Disponible' : 'No disponible'; ?></td></tr>
        <tr><td>mysqli</td><td class="mono <?php echo $mysqliAvailable ? 'ok' : 'bad'; ?>"><?php echo $mysqliAvailable ? 'Disponible' : 'No disponible'; ?></td></tr>
        <tr><td>config.php</td><td class="mono <?php echo $configError === null ? 'ok' : 'bad'; ?>"><?php echo $configError === null ? h_server_check($configFile) : h_server_check($configError); ?></td></tr>
      </table>
    </div>

    <div class="card">
      <h2>MariaDB</h2>
      <table>
        <tr><td>Host configurado</td><td class="mono"><?php echo h_server_check($host); ?></td></tr>
        <tr><td>Resolucion DNS</td><td class="mono <?php echo $dnsResult ? 'ok' : 'bad'; ?>"><?php echo $dnsResult ? h_server_check(implode(', ', $dnsResult)) : 'Sin resolucion'; ?></td></tr>
        <tr><td>PDO MySQL</td><td class="mono <?php echo server_check_starts_with($pdoMessage, 'Conexion correcta') ? 'ok' : 'bad'; ?>"><?php echo h_server_check($pdoMessage); ?></td></tr>
        <tr><td>Version servidor</td><td class="mono"><?php echo h_server_check($pdoVersion !== '' ? $pdoVersion : 'No disponible'); ?></td></tr>
      </table>
    </div>

    <div class="card">
      <h2>Accesos utiles</h2>
      <table>
        <tr><td>Instalador</td><td class="mono"><a href="<?php echo h_server_check($installUrl); ?>"><?php echo h_server_check($installUrl); ?></a></td></tr>
        <tr><td>Login debug</td><td class="mono"><a href="<?php echo h_server_check($cleanLoginUrl); ?>"><?php echo h_server_check($cleanLoginUrl); ?></a></td></tr>
        <tr><td>Login directo</td><td class="mono"><a href="<?php echo h_server_check($directLoginUrl); ?>"><?php echo h_server_check($directLoginUrl); ?></a></td></tr>
        <tr><td>Debug instalador</td><td class="mono"><a href="<?php echo h_server_check($debugInstallUrl); ?>"><?php echo h_server_check($debugInstallUrl); ?></a></td></tr>
      </table>
    </div>
  </div>
</body>
</html>