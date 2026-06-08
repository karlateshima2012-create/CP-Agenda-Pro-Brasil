<?php
// deploy_hostinger/public_html/api/routes/availability.php

$user = Auth::requireAuth();
$accountId = $user['account_id'];

if ($path === 'availability' && $method === 'GET') {
    $availability = Db::fetch('SELECT working_hours, interval_minutes FROM cp_agenda_availability WHERE account_id = ?', [$accountId]);
    $blocked = Db::fetchAll('SELECT id, blocked_date as date, reason FROM cp_agenda_blocked_dates WHERE account_id = ?', [$accountId]);

    $resp = [
        'workingHours' => [],
        'blockedDates' => $blocked,
        'intervalMinutes' => 30
    ];

    if ($availability) {
        $resp['workingHours'] = json_decode($availability['working_hours'], true);
        $resp['intervalMinutes'] = (int)$availability['interval_minutes'];
    }
    
    Response::ok($resp);
}

if ($path === 'availability' && $method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $workingHours = json_encode($data['workingHours'] ?? []);
    $interval = (int)($data['intervalMinutes'] ?? 30);
    $blockedDates = $data['blockedDates'] ?? [];

    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();

        // 1. Upsert Availability
        $exists = Db::fetch('SELECT id FROM cp_agenda_availability WHERE account_id = ?', [$accountId]);
        if ($exists) {
            Db::query(
                'UPDATE cp_agenda_availability SET working_hours = ?, interval_minutes = ? WHERE account_id = ?',
                [$workingHours, $interval, $accountId]
            );
        } else {
            Db::query(
                'INSERT INTO cp_agenda_availability (account_id, working_hours, interval_minutes) VALUES (?, ?, ?)',
                [$accountId, $workingHours, $interval]
            );
        }

        // 2. Sync Blocked Dates (Delete all and re-insert)
        Db::query('DELETE FROM cp_agenda_blocked_dates WHERE account_id = ?', [$accountId]);

        foreach ($blockedDates as $b) {
            if (empty($b['date'])) continue;
            Db::query(
                'INSERT INTO cp_agenda_blocked_dates (account_id, blocked_date, reason) VALUES (?, ?, ?)',
                [$accountId, $b['date'], $b['reason'] ?? '']
            );
        }

        $pdo->commit();
        Response::ok(['msg' => 'Availability updated']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        Response::fail($e->getMessage(), 500);
    }
}

Response::fail('Not Found', 404);
