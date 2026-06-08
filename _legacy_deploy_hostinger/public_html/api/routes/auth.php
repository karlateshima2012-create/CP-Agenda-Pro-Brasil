<?php
// deploy_hostinger/public_html/api/routes/auth.php

// Required by index.php
// $method is available

if ($path === 'auth/login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        Response::fail('Email and password required');
    }

    // Lookup user
    $user = Db::fetch('SELECT * FROM cp_agenda_users WHERE email = ?', [$email]);

    if ($user && password_verify($password, $user['password_hash'])) {
        Auth::login($user);
        
        // Fetch account status
        $acc = Db::fetch('SELECT status FROM cp_agenda_accounts WHERE id = ?', [$user['account_id']]);
        $status = $acc ? $acc['status'] : 'active';

        Response::ok(['user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'account_id' => $user['account_id'],
            'account_status' => $status,
            'must_change_password' => (bool)$user['must_change_password']
        ]]);
    } else {
        Response::fail('E-mail ou senha incorretos', 401);
    }
}

if ($path === 'auth/logout' && $method === 'POST') {
    Auth::logout();
    Response::ok(['msg' => 'Logged out']);
}

if ($path === 'auth/forgot-password' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    if (empty($email)) Response::fail('Email required');
    
    $user = Db::fetch('SELECT id FROM cp_agenda_users WHERE email = ?', [$email]);
    if ($user) {
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
        Db::query('UPDATE cp_agenda_users SET reset_token = ?, reset_expires = ? WHERE id = ?', [$token, $expiry, $user['id']]);
        
        // Send Email
        $resetLink = "https://cpagendapro.creativeprintjp.com/reset-password?code=$token";
        
        $subject = "Recuperação de Senha - CP Agenda Pro";
        $body = "
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset='UTF-8'>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; }
            .header { background-color: #ffffff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0; }
            .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
            .button { display: inline-block; background-color: #25aae1; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; font-size: 16px; }
            .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888888; }
            .link-text { color: #25aae1; word-break: break-all; font-size: 13px; margin-top: 10px; display: block; }
          </style>
        </head>
        <body>
          <div class='container'>
            <div class='header'>
               <h1 style='color: #333; margin: 0; font-size: 24px;'>Recuperação de Senha</h1>
            </div>
            <div class='content'>
              <p style='font-size: 18px; margin-top: 0;'>Olá,</p>
              <p>Você solicitou a redefinição de senha para sua conta no <strong>CP Agenda Pro</strong>.</p>
              <p>Para criar uma nova senha, clique no botão abaixo:</p>
              
              <div style='text-align: center; margin: 30px 0;'>
                <a href='$resetLink' class='button'>Redefinir Minha Senha</a>
              </div>
              
              <p style='margin-bottom: 5px;'>Ou copie e cole este link no seu navegador:</p>
              <span class='link-text'>$resetLink</span>
              
              <br>
              <p style='color: #666; font-size: 14px;'>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
            </div>
            <div class='footer'>
              &copy; " . date('Y') . " CP Agenda Pro. Todos os direitos reservados.
            </div>
          </div>
        </body>
        </html>
        ";
        
        Mail::send($email, $subject, $body);
    }
    
    Response::ok(['msg' => 'If this email is registered, you will receive reset instructions.']);
}

if ($path === 'auth/reset-password' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $code = $data['code'] ?? '';
    $newPass = $data['password'] ?? '';
    
    if (empty($code) || empty($newPass)) Response::fail('Code and password required');
    
    $user = Db::fetch('SELECT id FROM cp_agenda_users WHERE reset_token = ? AND reset_expires > NOW()', [$code]);
    if (!$user) {
        Response::fail('Invalid or expired reset code', 400);
    }
    
    $hash = password_hash($newPass, PASSWORD_DEFAULT);
    Db::query('UPDATE cp_agenda_users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [$hash, $user['id']]);
    
    Response::ok(['msg' => 'Password reset successful']);
}

Response::fail('Not Found', 404);
