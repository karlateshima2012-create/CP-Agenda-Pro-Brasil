<?php
// deploy_hostinger/public_html/api/lib/Response.php

class Response {
    public static function json($payload, $code = 200) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($code);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if ($encoded === false) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'JSON encoding failed: ' . json_last_error_msg()]);
        } else {
            echo $encoded;
        }
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
