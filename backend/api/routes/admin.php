<?php
// backend/api/routes/admin.php

$user = Auth::requireAuth();
// ✅ SECURITY FIX: Debug logging only when DEBUG_MODE=true in .env
if (DEBUG_MODE) {
    file_put_contents(__DIR__ . '/../debug.log', date('Y-m-d H:i:s') . " - ADMIN: Path=$path | Method=$method | Role={$user['role']}\n", FILE_APPEND);
}
if ($user['role'] !== 'admin' && $user['role'] !== 'super_admin') Response::fail('Forbidden', 403);

if ($path === 'admin/profiles' && $method === 'GET') {
    $profiles = Db::fetchAll(
        "SELECT
            u.id, u.email, u.role,
            a.name            AS companyName,
            a.owner_name      AS ownerName,
            a.status          AS accountStatus,
            a.plan_type       AS planType,
            a.plan_expires_at AS planExpiresAt,
            a.contact_phone   AS contactPhone,
            a.lifetime_appointments AS appointmentCount,
            a.last_access_at  AS lastAccessAt,
            a.created_at      AS createdAt,

            (SELECT MAX(start_at)
               FROM cp_agenda_appointments
              WHERE account_id = a.id
                AND status = 'confirmed'
                AND deleted_at IS NULL) AS lastAppointmentAt,

            (SELECT COUNT(*)
               FROM cp_agenda_appointments
              WHERE account_id = a.id
                AND status NOT IN ('canceled','rejected')
                AND deleted_at IS NULL
                AND start_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS appointmentsLast30Days,

            (SELECT COUNT(*)
               FROM cp_agenda_services
              WHERE account_id = a.id
                AND is_active = 1) AS servicesCount,

            IF(a.telegram_chat_id  IS NOT NULL AND a.telegram_chat_id  != '', 1, 0) AS hasTelegram,
            IF(a.profile_image     IS NOT NULL AND a.profile_image     != '', 1, 0) AS hasProfileImage,
            IF(a.cover_image       IS NOT NULL AND a.cover_image       != '', 1, 0) AS hasCoverImage,
            IF(a.short_description IS NOT NULL AND a.short_description != '', 1, 0) AS hasDescription,
            a.invoices AS invoices

         FROM cp_agenda_users u
         JOIN cp_agenda_accounts a ON u.account_id = a.id
         WHERE u.role = 'client'
         ORDER BY a.created_at DESC"
    );
    
    // Convert invoices JSON string to array for the frontend
    foreach ($profiles as &$profile) {
        $profile['invoices'] = $profile['invoices'] ? json_decode($profile['invoices'], true) : [];
    }
    
    Response::ok($profiles);
}

if (preg_match('/^admin\/profiles\/(\d+)$/', $path, $matches) && $method === 'PATCH') {
    $userId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Update account associated with this user
    $usr = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = ?', [$userId]);
    if (!$usr) Response::fail('User not found');
    
    $accId = $usr['account_id'];

    // ✅ FIX: Explicit mapping from frontend camelCase keys to DB column names
    // Previously used regex snake_case conversion which mapped 'companyName' to 'company_name'
    // but the DB column is 'name', so updates were silently ignored.
    $fieldMap = [
        'companyName'   => 'name',
        'ownerName'     => 'owner_name',
        'contactPhone'  => 'contact_phone',
        'accountStatus' => 'status',
        'planType'      => 'plan_type',
        'planExpiresAt' => 'plan_expires_at',
        // Direct snake_case keys (fallback for any callers using snake_case)
        'name'              => 'name',
        'owner_name'        => 'owner_name',
        'contact_phone'     => 'contact_phone',
        'status'            => 'status',
        'plan_type'         => 'plan_type',
        'plan_expires_at'   => 'plan_expires_at',
        'invoices'          => 'invoices',
    ];

    $sets = [];
    $params = [];
    $newEmail = null;

    foreach ($data as $key => $val) {
        if (isset($fieldMap[$key])) {
            $col = $fieldMap[$key];
            $sets[] = "`$col` = ?";
            $params[] = is_array($val) ? json_encode($val) : $val;
        } elseif ($key === 'email') {
            // Email lives in cp_agenda_users, handle separately
            $newEmail = $val;
        }
    }

    if ($sets) {
        $params[] = $accId;
        Db::query('UPDATE cp_agenda_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
    }

    // Update email in the users table if provided
    if ($newEmail !== null) {
        $existing = Db::fetch('SELECT id FROM cp_agenda_users WHERE email = ? AND id != ?', [$newEmail, $userId]);
        if ($existing) {
            Response::fail('Este e-mail já está em uso por outro usuário.', 409);
        }
        Db::query('UPDATE cp_agenda_users SET email = ? WHERE id = ?', [$newEmail, $userId]);
    }

    Response::ok(['msg' => 'Profile updated']);
}

if (preg_match('/^admin\/profiles\/(\d+)\/renew$/', $path, $matches) && $method === 'POST') {
    $userId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    $months = (int)($data['months'] ?? 1);
    
    $usr = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = ?', [$userId]);
    $acc = Db::fetch('SELECT plan_expires_at FROM cp_agenda_accounts WHERE id = ?', [$usr['account_id']]);
    
    $currentMatch = $acc['plan_expires_at'];
    $date = (strtotime($currentMatch) > time()) ? strtotime($currentMatch) : time();
    $newExpiry = date('Y-m-d H:i:s', strtotime("+$months months", $date));
    
    Db::query('UPDATE cp_agenda_accounts SET plan_expires_at = ?, status = "active" WHERE id = ?', [$newExpiry, $usr['account_id']]);
    Response::ok(['newExpiryDate' => $newExpiry]);
}

if ($path === 'admin/users' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // ✅ SECURITY [A-7]: Validate required fields before inserting
    $required = ['email', 'password', 'companyName', 'ownerName'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            Response::fail("Campo obrigatório ausente: $field", 422);
        }
    }
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        Response::fail('E-mail inválido.', 422);
    }
    if (strlen($data['password']) < 8) {
        Response::fail('A senha deve ter ao menos 8 caracteres.', 422);
    }
    $exists = Db::fetch('SELECT id FROM cp_agenda_users WHERE email = ?', [$data['email']]);
    if ($exists) {
        Response::fail('E-mail já cadastrado.', 409);
    }

    // Atomic creation
    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();
        
        
        $planType = $data['planType'] ?? '6m';
        $months = match($planType) {
            '12m' => 12,
            '6m' => 6,
            '3m' => 3,
            '1m' => 1,
            default => 6
        };
        $expiresAt = date('Y-m-d H:i:s', strtotime("+$months months"));
        
        Db::query('INSERT INTO cp_agenda_accounts (name, owner_name, status, contact_phone, plan_type, plan_expires_at) VALUES (?, ?, ?, ?, ?, ?)', 
            [$data['companyName'], $data['ownerName'], 'active', $data['contactPhone'] ?? '', $planType, $expiresAt]);
        $accId = $pdo->lastInsertId();
        
        Db::query('INSERT INTO cp_agenda_users (account_id, email, password_hash, role, name, must_change_password) VALUES (?, ?, ?, ?, ?, ?)', [
            $accId,
            $data['email'],
            password_hash($data['password'], PASSWORD_DEFAULT),
            'client',
            $data['ownerName'],
            1
        ]);
        
        $pdo->commit();

        // ✅ AUTOMATION: Send Welcome Email
        $userName = $data['ownerName'];
        $userEmail = $data['email'];
        $password = $data['password'];
        $loginUrl = "https://" . $_SERVER['HTTP_HOST'];
        $landingPage = "https://saibamaiscpagendapro.creativeprintjp.com/";

        $subject = "Sua Agenda Profissional está pronta! - CP Agenda Pro";
        $body = "
        <div style='font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden;'>
            <div style='background: #25aae1; padding: 30px; text-align: center;'>
                <h1 style='color: white; margin: 0; font-size: 24px;'>Bem-vindo ao CP Agenda Pro!</h1>
            </div>
            <div style='padding: 30px;'>
                <p>Olá, <strong>{$userName}</strong>,</p>
                <p>Sua plataforma de agendamentos foi configurada com sucesso. Agora você já pode organizar seus horários e serviços de forma profissional.</p>
                
                <div style='background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;'>
                    <p style='margin: 0 0 15px 0; font-weight: bold; color: #1e293b;'>Suas Credenciais de Acesso:</p>
                    <p style='margin: 8px 0; font-size: 14px;'><strong>E-mail:</strong> <span style='color: #25aae1;'>{$userEmail}</span></p>
                    <p style='margin: 8px 0; font-size: 14px;'><strong>Senha Temporária:</strong> <span style='color: #25aae1;'>{$password}</span></p>
                </div>

                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$loginUrl}' style='background: #25aae1; color: white; padding: 15px 35px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;'>ACESSAR MEU PAINEL</a>
                </div>

                <p style='font-size: 13px; color: #64748b;'><strong>Importante:</strong> Por segurança, o sistema solicitará a alteração desta senha no seu primeiro acesso.</p>
                
                <hr style='border: 0; border-top: 1px solid #eee; margin: 30px 0;'>
                
                <p style='font-size: 14px;'>Dúvidas? Acesse nosso site oficial ou entre em contato com nosso suporte.</p>
                <p style='font-size: 14px;'>
                    <a href='{$landingPage}' style='color: #25aae1; text-decoration: none;'>Página Oficial</a> | 
                    <a href='https://wa.me/819011886491' style='color: #25aae1; text-decoration: none;'>Suporte WhatsApp</a>
                </p>
            </div>
            <div style='background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;'>
                © " . date('Y') . " creative print. todos os direitos reservados.
            </div>
        </div>
        ";

        Mail::send($userEmail, $subject, $body);

        Response::ok(['id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        $pdo->rollBack();
        Response::fail($e->getMessage());
    }
}

if (preg_match('/^admin\/users\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
    $userId = $matches[1];
    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();

        $usr = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = ?', [$userId]);
        if (!$usr) {
            $pdo->rollBack();
            Response::fail('Profissional não encontrado.', 404);
        }

        // The schema uses ON DELETE CASCADE, but for extra safety (in case of manual changes or variations)
        // we delete the account which triggers the cascade to users, services, appointments, etc.
        Db::query('DELETE FROM cp_agenda_accounts WHERE id = ?', [$usr['account_id']]);
        
        $pdo->commit();
        Response::ok(['msg' => 'Profissional excluído com sucesso.']);
    } catch (Exception $e) {
        if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
        Response::fail('Erro técnico ao excluir profissional: ' . $e->getMessage(), 500);
    }
}

Response::fail("Not Found: '$path'", 404);
