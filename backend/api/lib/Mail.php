<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../../vendor/autoload.php';

class Mail {
    /**
     * Sends an HTML email via SMTP.
     * All credentials are loaded from environment variables — never hardcoded.
     */
    public static function send(string $to, string $subject, string $body): bool {
        $mail = new PHPMailer(true);

        // ✅ SECURITY: Credentials loaded from environment — not hardcoded
        $smtpHost     = get_config_var('SMTP_HOST',     'smtp.hostinger.com');
        $smtpUser     = get_config_var('SMTP_USER',     '');
        $smtpPassword = get_config_var('SMTP_PASSWORD', '');
        $smtpPort     = (int) get_config_var('SMTP_PORT', '465');
        $smtpFrom     = get_config_var('SMTP_FROM',     $smtpUser);
        $smtpFromName = get_config_var('SMTP_FROM_NAME','CP Agenda Pro');

        if (empty($smtpUser) || empty($smtpPassword)) {
            error_log('MAIL_ERROR: SMTP credentials not configured in environment.');
            return false;
        }

        try {
            $mail->isSMTP();
            $mail->Host       = $smtpHost;
            $mail->SMTPAuth   = true;
            $mail->Username   = $smtpUser;
            $mail->Password   = $smtpPassword;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = $smtpPort;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom($smtpFrom, $smtpFromName);
            $mail->addAddress($to);
            $mail->addReplyTo($smtpFrom, 'Suporte');

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            $mail->AltBody = strip_tags($body);

            return $mail->send();
        } catch (Exception $e) {
            // 🔔 Email failures are often silent — alert so they're never missed
            $errorInfo = $mail->ErrorInfo;
            error_log("MAIL_ERROR: $errorInfo");
            if (class_exists('Monitor')) {
                Monitor::critical('Falha no envio de e-mail', [
                    'to'         => $to,
                    'subject'    => $subject,
                    'smtp_error' => $errorInfo,
                ]);
            }
            return false;
        }
    }
}
