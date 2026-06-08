<?php
// backend/api/index.php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/Db.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Response.php';
require_once __DIR__ . '/lib/Mail.php';
require_once __DIR__ . '/lib/Monitor.php';

// ✅ SECURITY FIX: CORS Allowlist — only accept requests from known, trusted origins
$allowedOrigins = [
    'https://cpagendapro.creativeprintjp.com',
    'http://localhost:5173',
    'http://localhost:5174',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
} elseif (empty($origin)) {
    // Server-to-server requests (no browser Origin header) — allow with prod default
    header('Access-Control-Allow-Origin: https://cpagendapro.creativeprintjp.com');
}
// If origin is not in allowlist and is not empty, no CORS header is sent = blocked by browser.

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Router
$method = $_SERVER['REQUEST_METHOD'];
$path = '';
$uri = $_SERVER['REQUEST_URI'] ?? '';

if (isset($_GET['path'])) {
    $path = $_GET['path'];
} else {
    $full_path = parse_url($uri, PHP_URL_PATH);
    if (strpos($full_path, '/api/') !== false) {
        $path = substr($full_path, strpos($full_path, '/api/') + 5);
    } else {
        $path = preg_replace('/^\/api/', '', $full_path);
    }
}

$path = trim($path, '/');

// ✅ SECURITY FIX: Debug logging ONLY when DEBUG_MODE is explicitly enabled via .env
if (DEBUG_MODE) {
    file_put_contents(__DIR__ . '/debug.log', date('Y-m-d H:i:s') . " - URI: $uri | Path: $path | Method: $method\n", FILE_APPEND);
}

// Initialize Auth
Auth::init();

// ✅ MONITORING: Register global error/exception handlers → alerts via Telegram
Monitor::register();

// Diagnostic Routes
if ($path === 'ping') {
    Response::ok(['msg' => 'PONG', 'version' => API_VERSION]);
}

if ($path === 'db') {
    try {
        $result = Db::fetch('SELECT 1 as ok');
        Response::ok($result);
    } catch (Exception $e) {
        // 🔴 DB connection failure is the most critical possible error — alert immediately
        Monitor::critical('Falha na conexão com o banco de dados', [
            'error' => $e->getMessage(),
            'path'  => $path,
        ]);
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
    case 'telegram-webhook':
        require_once __DIR__ . '/routes/telegram_webhook.php';
        break;
    case 'clients':
        require_once __DIR__ . '/routes/clients.php';
        break;
    case 'telegram-register':
        // ✅ SECURITY FIX: Token loaded from environment variable — never hardcoded
        $token = get_env_var('TELEGRAM_BOT_TOKEN', '');
        if (empty($token)) {
            Response::fail('TELEGRAM_BOT_TOKEN not configured in environment', 500);
        }
        $domain = $_SERVER['HTTP_HOST'];
        $webhookUrl = "https://{$domain}/api/telegram-webhook";
        $url = "https://api.telegram.org/bot{$token}/setWebhook?url=" . urlencode($webhookUrl);
        $res = @file_get_contents($url);
        Response::ok(['status' => 'webhook_registered', 'response' => json_decode($res, true), 'url' => $webhookUrl]);
        break;
    default:
        Response::fail("Not Found: $path ($method)", 404);
}
