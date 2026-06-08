<?php
// deploy_hostinger/public_html/api/routes/admin.php

$user = Auth::requireAuth();
file_put_contents(__DIR__ . '/../debug.log', date('Y-m-d H:i:s') . " - ADMIN: Path=$path | Method=$method | Role={$user['role']}\n", FILE_APPEND);
if ($user['role'] !== 'admin' && $user['role'] !== 'super_admin') Response::fail('Forbidden', 403);

if ($path === 'admin/profiles' && $method === 'GET') {
    // Debug log
    error_log("Fetching admin profiles...");
    $profiles = Db::fetchAll("SELECT u.id, u.email, u.role, a.name as companyName, a.owner_name as ownerName, a.status as accountStatus, a.plan_type as planType, a.plan_expires_at as planExpiresAt, a.contact_phone as contactPhone, a.lifetime_appointments as appointmentCount, a.created_at as createdAt FROM cp_agenda_users u JOIN cp_agenda_accounts a ON u.account_id = a.id WHERE u.role = 'client' ORDER BY a.created_at DESC");
    error_log("Found " . count($profiles) . " profiles");
    Response::ok($profiles);
}

if (preg_match('/^admin\/profiles\/(\d+)$/', $path, $matches) && $method === 'PATCH') {
    $userId = $matches[1];
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Update account associated with this user
    $usr = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = ?', [$userId]);
    if (!$usr) Response::fail('User not found');
    
    $accId = $usr['account_id'];
    $allowed = ['name', 'owner_name', 'status', 'plan_type', 'plan_expires_at', 'contact_phone'];
    $sets = [];
    $params = [];
    foreach ($data as $key => $val) {
        $snake = strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
        if ($snake === 'account_status') $snake = 'status';
        if (in_array($snake, $allowed)) {
            $sets[] = "`$snake` = ?";
            $params[] = $val;
        }
    }
    if ($sets) {
        $params[] = $accId;
        Db::query('UPDATE cp_agenda_accounts SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
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
    error_log("ADMIN USER CREATE DATA: " . print_r($data, true));
    // Atomic creation
    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();
        
        
        $planType = $data['planType'] ?? '6m';
        $months = ($planType === '12m') ? 12 : 6;
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
        Response::ok(['id' => $pdo->lastInsertId()]);
    } catch (Exception $e) {
        $pdo->rollBack();
        Response::fail($e->getMessage());
    }
}

if (preg_match('/^admin\/users\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
    $userId = $matches[1];
    $usr = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = ?', [$userId]);
    if ($usr) {
        Db::query('DELETE FROM cp_agenda_accounts WHERE id = ?', [$usr['account_id']]); // Cascades to user
    }
    Response::ok(['msg' => 'Deleted']);
}

Response::fail("Not Found: '$path'", 404);
