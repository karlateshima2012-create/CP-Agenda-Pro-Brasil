<?php
// backend/api/routes/clients.php

$user = Auth::requireAuth();
$accountId = $user['account_id'];

if ($path === 'clients' && $method === 'GET') {
    $search = $_GET['search'] ?? '';
    
    $sql = 'SELECT * FROM cp_agenda_clients WHERE account_id = ?';
    $params = [$accountId];
    
    if (!empty($search)) {
        $sql .= ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
        $searchParam = "%$search%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    $sql .= ' ORDER BY name ASC';
    $clients = Db::fetchAll($sql, $params);
    Response::ok($clients);
}

if ($path === 'clients' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    $phoneRaw = $data['phone'] ?? '';
    $email = $data['email'] ?? '';
    
    if (empty($name) || empty($phoneRaw)) {
        Response::fail('Nome e Telefone são obrigatórios', 400);
    }
    
    // Normalize phone
    $phone = preg_replace('/\D/', '', $phoneRaw);
    
    Db::query(
        'INSERT INTO cp_agenda_clients (account_id, name, phone, email) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), updated_at = NOW()',
        [$accountId, $name, $phone, $email]
    );
    
    Response::ok(['msg' => 'Cliente salvo com sucesso']);
}

if (preg_match('/^clients\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
    $id = $matches[1];
    Db::query('DELETE FROM cp_agenda_clients WHERE id = ? AND account_id = ?', [$id, $accountId]);
    Response::ok(['msg' => 'Client deleted']);
}

Response::fail('Not Found', 404);
