<?php
// deploy_hostinger/public_html/api/lib/Auth.php

class Auth {
    public static function init() {
        if (session_status() === PHP_SESSION_NONE) {
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => '/',
                'domain' => '', // Default to current domain
                'secure' => true,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            session_start();
        }
    }

    public static function login($user) {
        self::init();
        $_SESSION['user'] = [
            'id' => $user['id'],
            'account_id' => $user['account_id'],
            'role' => $user['role'],
            'name' => $user['name'],
            'email' => $user['email'],
            'must_change_password' => isset($user['must_change_password']) ? (bool)$user['must_change_password'] : false
        ];
    }

    public static function logout() {
        self::init();
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
    }

    public static function getUser() {
        self::init();
        return $_SESSION['user'] ?? null;
    }

    public static function requireAuth() {
        $user = self::getUser();
        if (!$user) {
            require_once __DIR__ . '/Response.php';
            Response::fail('Unauthorized', 401);
        }
        return $user;
    }

    public static function getAccountId() {
        $user = self::getUser();
        return $user ? $user['account_id'] : null;
    }
}
