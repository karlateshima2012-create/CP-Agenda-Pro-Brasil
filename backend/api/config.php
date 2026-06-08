<?php
// backend/api/config.php

// DB Configuration
// Helper to safely get env vars
function get_env_var($key, $default = '') {
    $val = getenv($key);
    return ($val !== false) ? $val : $default;
}

// Load .env file if it exists
$envPath = null;
if (file_exists(__DIR__ . '/../../.env')) {
    $envPath = __DIR__ . '/../../.env';
} elseif (file_exists(__DIR__ . '/../.env')) {
    $envPath = __DIR__ . '/../.env';
}

if ($envPath) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (function_exists('putenv')) {
            putenv("{$name}={$value}");
        }
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

// DB Configuration - Fallback to $_ENV/$_SERVER if get_env_var fails
function get_config_var($key, $default = '') {
    $val = get_env_var($key, null);
    if ($val !== null) return $val;
    if (isset($_ENV[$key])) return $_ENV[$key];
    if (isset($_SERVER[$key])) return $_SERVER[$key];
    return $default;
}

define('DB_HOST',    get_config_var('DB_HOST',    '127.0.0.1'));
define('DB_PORT',    get_config_var('DB_PORT',    '3306'));
define('DB_NAME',    get_config_var('DB_NAME',    ''));
define('DB_USER',    get_config_var('DB_USER',    ''));
define('DB_PASS',    get_config_var('DB_PASS',    ''));
define('DB_CHARSET', get_config_var('DB_CHARSET', 'utf8mb4'));

// App Configuration
define('API_VERSION', get_config_var('API_VERSION', '1.0.0'));
// ✅ SECURITY FIX: DEBUG_MODE defaults to FALSE. Enable only via .env (DEBUG_MODE=true).
define('DEBUG_MODE', filter_var(get_config_var('DEBUG_MODE', 'false'), FILTER_VALIDATE_BOOLEAN));

// Timezone
date_default_timezone_set('Asia/Tokyo');
