<?php
// deploy_hostinger/public_html/api/index.php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Db.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Mail.php';

// Essential headers
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Better Router
$method = $_SERVER['REQUEST_METHOD'];
$path = '';

if (isset($_GET['path'])) {
    $path = $_GET['path'];
} else {
    $uri = $_SERVER['REQUEST_URI'];
    // Handle cases where the URL is something like /api/me
    $path = preg_replace('/^\/api/', '', parse_url($uri, PHP_URL_PATH));
}

$path = trim($path, '/');
// Debug log if needed (comment out in prod)
file_put_contents('debug.log', date('Y-m-d H:i:s') . " - URI: $uri | Path: $path | Method: $method\n", FILE_APPEND);

// Initialize Auth
Auth::init();

// Diagnostic Routes
if ($path === 'ping') {
    Response::ok(['msg' => 'PONG']);
}

if ($path === 'db') {
    try {
        $result = Db::fetch('SELECT 1 as ok');
        Response::ok($result);
    } catch (Exception $e) {
        Response::fail('DB_CONNECT_FAIL: ' . $e->getMessage(), 500);
    }
}

// Feature Routes
$parts = explode('/', $path);
$module = $parts[0] ?? '';

switch ($module) {
    case 'auth':
        require_once __DIR__ . '/routes/auth.php';
        break;
    case 'me':
        require_once __DIR__ . '/routes/me.php';
        break;
    case 'services':
        require_once __DIR__ . '/routes/services.php';
        break;
    case 'availability':
        require_once __DIR__ . '/routes/availability.php';
        break;
    case 'blocked-dates':
        require_once __DIR__ . '/routes/blocked_dates.php';
        break;
    case 'appointments':
        require_once __DIR__ . '/routes/appointments.php';
        break;
    case 'admin':
        require_once __DIR__ . '/routes/admin.php';
        break;
    case 'public':
        require_once __DIR__ . '/routes/public.php';
        break;
    default:
        Response::fail("Not Found: $path ($method)", 404);
}
