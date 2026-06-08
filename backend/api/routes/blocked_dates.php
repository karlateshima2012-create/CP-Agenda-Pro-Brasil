<?php
// deploy_hostinger/public_html/api/routes/blocked_dates.php

$user = Auth::requireAuth();
$accountId = $user['account_id'];

if ($path === 'blocked-dates' && $method === 'GET') {
    $dates = Db::fetchAll('SELECT * FROM cp_agenda_blocked_dates WHERE account_id = ?', [$accountId]);
    Response::ok($dates);
}

if ($path === 'blocked-dates' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $date = $data['date'] ?? null;
    $reason = $data['reason'] ?? '';
    $startTime = $data['startTime'] ?? null;
    $endTime = $data['endTime'] ?? null;

    if (!$date) Response::fail('Date is required');

    Db::query(
        'INSERT INTO cp_agenda_blocked_dates (account_id, blocked_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
        [$accountId, $date, $startTime, $endTime, $reason]
    );
    Response::ok(['id' => Db::getInstance()->getPdo()->lastInsertId()]);
}

if (preg_match('/^blocked-dates\/(\d+)$/', $path, $matches) && $method === 'DELETE') {
    $id = $matches[1];
    Db::query('DELETE FROM cp_agenda_blocked_dates WHERE id = ? AND account_id = ?', [$id, $accountId]);
    Response::ok(['msg' => 'Deleted']);
}

Response::fail('Not Found', 404);
