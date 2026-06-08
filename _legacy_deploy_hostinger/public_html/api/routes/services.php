<?php
// deploy_hostinger/public_html/api/routes/services.php

$user = Auth::requireAuth();
$accountId = $user['account_id'];

if ($path === 'services' && $method === 'GET') {
    $services = Db::fetchAll('SELECT * FROM cp_agenda_services WHERE account_id = ? ORDER BY sort_order ASC', [$accountId]);
    foreach ($services as &$s) {
        $s['price'] = (float)$s['price'];
        $s['duration'] = (int)$s['duration_min'];
    }
    Response::ok($services);
}

if ($path === 'services' && $method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) Response::fail('Invalid data');

    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();

        // Simple sync: delete current and insert new (as requested for services array)
        Db::query('DELETE FROM cp_agenda_services WHERE account_id = ?', [$accountId]);

        foreach ($data as $index => $svc) {
            Db::query(
                'INSERT INTO cp_agenda_services (account_id, name, description, duration_min, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    $accountId,
                    $svc['name'] ?? 'Serviço',
                    $svc['description'] ?? '',
                    $svc['duration'] ?? 30, // UI maps 'duration' to duration_min
                    $svc['price'] ?? 0,
                    $index
                ]
            );
        }

        $pdo->commit();
        Response::ok(['msg' => 'Services updated']);
    } catch (Exception $e) {
        $pdo->rollBack();
        Response::fail($e->getMessage(), 500);
    }
}

Response::fail('Not Found', 404);
