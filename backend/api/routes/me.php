<?php
// deploy_hostinger/public_html/api/routes/me.php

if ($path === 'me' && $method === 'GET') {
    $user = Auth::requireAuth();

    // Registra último acesso (throttle: só atualiza se passou mais de 1 hora)
    Db::query(
        'UPDATE cp_agenda_accounts SET last_access_at = NOW()
         WHERE id = ? AND (last_access_at IS NULL OR last_access_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))',
        [$user['account_id']]
    );

    // ✅ SECURITY [A-4]: Explicit columns only — never SELECT * on sensitive tables
    $account = Db::fetch(
        'SELECT name, status, plan_type, plan_expires_at,
                primary_color, secondary_color, short_description, services_title,
                services_subtitle, cover_image, view_mode, cover_opacity, profile_image, contact_phone,
                telegram_bot_token, telegram_chat_id, onboarding_seen,
                lifetime_appointments, created_at, invoices
         FROM cp_agenda_accounts WHERE id = ?',
        [$user['account_id']]
    );
    
    if ($account && isset($account['invoices'])) {
        $account['invoices'] = json_decode($account['invoices'], true) ?: [];
    } else if ($account) {
        $account['invoices'] = [];
    }

    Response::ok(['user' => $user, 'account' => $account]);
}

if ($path === 'me/profile' && $method === 'PATCH') {
    $user = Auth::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Filter allowed fields
    $allowed = ['name', 'short_description', 'services_title', 'services_subtitle', 'primary_color', 'secondary_color', 'cover_image', 'view_mode', 'cover_opacity', 'profile_image', 'telegram_bot_token', 'telegram_chat_id'];
    $sets = [];
    $params = [];
    foreach ($data as $key => $val) {
        // Map camelCase to snake_case if needed, but here they seem consistent or easily handled
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
        if (in_array($snake, $allowed)) {
            $sets[] = "`$snake` = ?";
            $params[] = $val;
        }
    }
    
    if ($sets) {
        $params[] = $user['account_id'];
        Db::query('UPDATE cp_agenda_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    }
    Response::ok(['msg' => 'Profile updated']);
}

if ($path === 'me/change-password' && $method === 'POST') {
    $user = Auth::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $newPass = $data['password'] ?? '';
    if (strlen($newPass) < 6) Response::fail('Password too short');
    
    $hash = password_hash($newPass, PASSWORD_DEFAULT);
    Db::query('UPDATE cp_agenda_users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [$hash, $user['id']]);
    
    // ✅ FIX: Update session state so the change is reflected immediately without logout
    if (isset($_SESSION['user'])) {
        $_SESSION['user']['must_change_password'] = false;
    }
    
    Response::ok(['msg' => 'Password updated']);
}

if ($path === 'me/onboarding' && $method === 'POST') {
    $user = Auth::requireAuth();
    $data = json_decode(file_get_contents('php://input'), true);
    $seen = $data['seen'] ? 1 : 0;
    Db::query('UPDATE cp_agenda_accounts SET onboarding_seen = ? WHERE id = ?', [$seen, $user['account_id']]);
    Response::ok(['msg' => 'Onboarding updated']);
}

Response::fail('Not Found', 404);
