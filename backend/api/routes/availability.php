<?php
// deploy_hostinger/public_html/api/routes/availability.php

$user = Auth::requireAuth();
$accountId = $user['account_id'];

if ($path === 'availability' && $method === 'GET') {
    $availability = Db::fetch('SELECT working_hours, interval_minutes, available_months FROM cp_agenda_availability WHERE account_id = ?', [$accountId]);
    $blocked = Db::fetchAll('SELECT id, blocked_date as date, start_time as startTime, end_time as endTime, reason FROM cp_agenda_blocked_dates WHERE account_id = ?', [$accountId]);

    $resp = [
        'workingHours' => [],
        'blockedDates' => $blocked,
        'intervalMinutes' => 30,
        'availableMonths' => [1,2,3,4,5,6,7,8,9,10,11,12]
    ];

    if ($availability) {
        $rawHours = $availability['working_hours'] ?? '[]';
        $resp['workingHours'] = is_string($rawHours) ? json_decode($rawHours, true) : $rawHours;
        $resp['intervalMinutes'] = (int)($availability['interval_minutes'] ?? 30);
        
        $rawMonths = $availability['available_months'] ?? null;
        $resp['availableMonths'] = is_string($rawMonths) ? json_decode($rawMonths, true) : ($rawMonths ?? [1,2,3,4,5,6,7,8,9,10,11,12]);
    }
    
    Response::ok($resp);
}

if ($path === 'availability' && $method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $workingHours = json_encode($data['workingHours'] ?? []);
    $interval = (int)($data['intervalMinutes'] ?? 30);
    $blockedDates = $data['blockedDates'] ?? [];
    $availableMonths = json_encode($data['availableMonths'] ?? [1,2,3,4,5,6,7,8,9,10,11,12]);

    try {
        $pdo = Db::getInstance()->getPdo();
        $pdo->beginTransaction();

        // 1. Upsert Availability
        $exists = Db::fetch('SELECT id FROM cp_agenda_availability WHERE account_id = ?', [$accountId]);
        
        // Defensive check: ensure $workingHours is valid JSON string
        if (is_array($data['workingHours'] ?? null)) {
            $workingHours = json_encode($data['workingHours']);
        } else {
            $workingHours = '[]';
        }

        if ($exists) {
            Db::query(
                'UPDATE cp_agenda_availability SET working_hours = ?, interval_minutes = ?, available_months = ? WHERE account_id = ?',
                [$workingHours, $interval, $availableMonths, $accountId]
            );
        } else {
            Db::query(
                'INSERT INTO cp_agenda_availability (account_id, working_hours, interval_minutes, available_months) VALUES (?, ?, ?, ?)',
                [$accountId, $workingHours, $interval, $availableMonths]
            );
        }

        // 2. Sync Blocked Dates (Delete all and re-insert)
        Db::query('DELETE FROM cp_agenda_blocked_dates WHERE account_id = ?', [$accountId]);

        foreach ($blockedDates as $b) {
            if (empty($b['date'])) continue;
            Db::query(
                'INSERT INTO cp_agenda_blocked_dates (account_id, blocked_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
                [$accountId, $b['date'], $b['startTime'] ?? null, $b['endTime'] ?? null, $b['reason'] ?? '']
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
