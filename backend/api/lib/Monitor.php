<?php
// backend/api/lib/Monitor.php

/**
 * Monitor — Error alerting via Telegram.
 *
 * Catches unhandled PHP exceptions and fatal errors and sends a
 * formatted alert to a dedicated Telegram chat for operational monitoring.
 *
 * Configuration (environment variables):
 *   TELEGRAM_MONITOR_TOKEN — Token of the dedicated monitoring bot (separate from the appointment bot)
 *   TELEGRAM_ERROR_CHAT_ID — Your personal Chat ID (destination for alerts)
 *
 * Rate limiting: identical alerts are suppressed for 5 minutes to prevent spam.
 */
class Monitor
{
    private const RATE_LIMIT_SECONDS = 300; // 5 minutes between identical alerts
    private const CACHE_DIR_NAME     = 'cp_agenda_monitor';

    // ------------------------------------------------------------------ //
    //  Public API                                                          //
    // ------------------------------------------------------------------ //

    /**
     * Register PHP global error/exception handlers.
     * Call once, early in index.php.
     */
    public static function register(): void
    {
        // Uncaught exceptions (e.g. thrown but never caught)
        set_exception_handler(function (\Throwable $e) {
            self::alertException($e, 'Uncaught Exception');
            // Return a clean 500 to the client
            if (!headers_sent()) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(500);
            }
            echo json_encode(['ok' => false, 'error' => 'Internal server error']);
            exit;
        });

        // Fatal errors that PHP normally swallows (E_ERROR, E_PARSE, etc.)
        register_shutdown_function(function () {
            $err = error_get_last();
            $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
            if ($err && in_array($err['type'], $fatalTypes, true)) {
                self::alertError(
                    $err['message'],
                    $err['file'],
                    $err['line'],
                    'Fatal Error'
                );
            }
        });
    }

    /**
     * Manually send a critical alert (use for caught errors you still want to track).
     *
     * Example:
     *   Monitor::critical('Payment webhook failed', ['order_id' => 42, 'reason' => $e->getMessage()]);
     */
    public static function critical(string $message, array $context = []): void
    {
        $contextText = empty($context)
            ? ''
            : "\n\n📋 *Contexto:*\n```\n" . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n```";

        self::sendAlert("🔴 *ALERTA MANUAL*\n\n$message$contextText");
    }

    // ------------------------------------------------------------------ //
    //  Internal helpers                                                    //
    // ------------------------------------------------------------------ //

    private static function alertException(\Throwable $e, string $label): void
    {
        $trace = self::formatTrace($e->getTraceAsString());
        $message = self::buildMessage(
            emoji:   '💥',
            label:   $label,
            text:    $e->getMessage(),
            file:    $e->getFile(),
            line:    $e->getLine(),
            extra:   $trace
        );
        self::sendAlert($message, md5($e->getMessage() . $e->getFile() . $e->getLine()));
    }

    private static function alertError(string $msg, string $file, int $line, string $label): void
    {
        $message = self::buildMessage(
            emoji: '🔥',
            label: $label,
            text:  $msg,
            file:  $file,
            line:  $line
        );
        self::sendAlert($message, md5($msg . $file . $line));
    }

    private static function buildMessage(
        string $emoji,
        string $label,
        string $text,
        string $file,
        int    $line,
        string $extra = ''
    ): string {
        $env     = defined('DEBUG_MODE') && DEBUG_MODE ? 'DEV' : 'PRODUÇÃO';
        $host    = $_SERVER['HTTP_HOST']    ?? 'unknown';
        $uri     = $_SERVER['REQUEST_URI']  ?? 'unknown';
        $method  = $_SERVER['REQUEST_METHOD'] ?? 'unknown';
        $ip      = $_SERVER['REMOTE_ADDR']  ?? 'unknown';
        $now     = date('d/m/Y H:i:s T');

        // Shorten file path for readability
        $shortFile = preg_replace('/.*\/api\//', 'api/', $file);

        $lines = [
            "$emoji *CP Agenda Pro — $label*",
            "",
            "🌍 *Ambiente:* $env",
            "🕐 *Quando:* $now",
            "🌐 *Request:* `$method $host$uri`",
            "📍 *IP:* `$ip`",
            "",
            "❌ *Erro:*",
            "```",
            self::truncate($text, 600),
            "```",
            "",
            "📁 *Arquivo:* `$shortFile` linha `$line`",
        ];

        if (!empty($extra)) {
            $lines[] = "";
            $lines[] = "🔍 *Stack Trace (resumo):*";
            $lines[] = "```";
            $lines[] = $extra;
            $lines[] = "```";
        }

        return implode("\n", $lines);
    }

    private static function sendAlert(string $text, string $rateKey = ''): void
    {
        // ✅ Uses dedicated monitoring bot — separate from the appointment notification bot
        $token  = get_config_var('TELEGRAM_MONITOR_TOKEN', '');
        $chatId = get_config_var('TELEGRAM_ERROR_CHAT_ID', '');

        if (empty($token) || empty($chatId)) {
            error_log('[Monitor] TELEGRAM_MONITOR_TOKEN or TELEGRAM_ERROR_CHAT_ID not set in environment.');
            return;
        }

        // Rate limiting: skip if identical error was sent recently
        if (!empty($rateKey) && !self::checkRateLimit($rateKey)) {
            return;
        }

        $payload = json_encode([
            'chat_id'    => $chatId,
            'text'       => $text,
            'parse_mode' => 'Markdown',
        ]);

        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => "Content-Type: application/json\r\n",
                'content'       => $payload,
                'timeout'       => 5,    // Never let Telegram block a PHP request
                'ignore_errors' => true,
            ],
        ]);

        $url = "https://api.telegram.org/bot{$token}/sendMessage";

        // Suppress errors — monitoring must never crash the application
        @file_get_contents($url, false, $context);
    }

    /**
     * Returns true if the alert should be sent (not rate-limited).
     */
    private static function checkRateLimit(string $key): bool
    {
        $cacheDir = sys_get_temp_dir() . '/' . self::CACHE_DIR_NAME;
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0700, true);
        }

        $file = $cacheDir . '/' . md5($key) . '.ts';
        $now  = time();

        if (file_exists($file)) {
            $lastSent = (int) file_get_contents($file);
            if (($now - $lastSent) < self::RATE_LIMIT_SECONDS) {
                return false; // Still within cooldown
            }
        }

        file_put_contents($file, $now, LOCK_EX);
        return true;
    }

    /**
     * Formats and truncates a PHP stack trace to the most relevant lines.
     */
    private static function formatTrace(string $raw): string
    {
        $lines = explode("\n", $raw);
        // Keep only first 6 frames and strip full paths
        $relevant = array_slice($lines, 0, 6);
        $cleaned  = array_map(
            fn($l) => preg_replace('/.*\/api\//', 'api/', $l),
            $relevant
        );
        return implode("\n", $cleaned);
    }

    private static function truncate(string $text, int $max): string
    {
        return mb_strlen($text) > $max
            ? mb_substr($text, 0, $max) . '…'
            : $text;
    }
}
