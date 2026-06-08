<?php
// backend/api/routes/telegram_webhook.php

// Telegram sends POST requests with JSON body
$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update || !isset($update['message'])) {
    exit; // Silently exit for non-message updates
}

$message = $update['message'];
$chatId = $message['chat']['id'] ?? null;
$text = $message['text'] ?? '';

if ($chatId && (strpos($text, '/start') === 0)) {
    // Definimos o Token Oficial fornecido pelo usuário
    $token = '8679011580:AAGYmZRTeLJTkekfHcJzM-4KriplY_g_6Rk';
    
    // Prepare the message in the format requested by the user
    $msg = "Olá! Bem-vindo ao assistente do <b>CP Agenda Pro</b> 🚀\n\n"
         . "🆔 Seu Chat ID: <code>{$chatId}</code> (Toque no número para copiar)\n\n"
         . "📍 <b>O que fazer agora?</b>\n"
         . "1️⃣ Copie o número acima.\n"
         . "2️⃣ Vá até o seu painel em <b>Minha Conta</b>.\n"
         . "3️⃣ No campo <b>Seu Chat ID</b>, cole esse número.\n"
         . "4️⃣ Clique em <b>Salvar Alterações</b>.\n\n"
         . "Pronto! Agora você receberá as notificações de agendamentos aqui. ⚡";

    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    $params = [
        'chat_id' => $chatId,
        'text' => $msg,
        'parse_mode' => 'HTML'
    ];

    // Use curl or file_get_contents for simple post
    $options = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content' => http_build_query($params)
        ]
    ];
    $context  = stream_context_create($options);
    file_get_contents($url, false, $context);
}

// Always return 200 OK to Telegram
header('HTTP/1.1 200 OK');
echo json_encode(['status' => 'ok']);
exit;
