<?php
// deploy_hostinger/public_html/api/lib/Response.php

class Response {
    public static function json($payload, $code = 200) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        echo json_encode($payload);
        exit;
    }

    public static function ok($data = null) {
        self::json([
            'ok' => true,
            'data' => $data
        ]);
    }

    public static function fail($message, $code = 400) {
        self::json([
            'ok' => false,
            'error' => $message
        ], $code);
    }
}
