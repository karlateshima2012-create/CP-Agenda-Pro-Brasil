<?php
// deploy_hostinger/public_html/api/routes/public.php

if (preg_match('/^public\/profile\/([^\/]+)$/', $path, $matches) && $method === 'GET') {
    $idOrSlug = $matches[1];
    
    // Lookup by ID or Slug (assuming id for now for simplicity)
    $profile = Db::fetch('SELECT id, name, status, plan_type, plan_expires_at, primary_color, secondary_color, short_description, services_title, services_subtitle, cover_image, profile_image, lifetime_appointments FROM cp_agenda_accounts WHERE id = ?', [$idOrSlug]);
    
    if (!$profile) {
        Response::fail('Profile not found', 404);
    }

    if ($profile['status'] !== 'active') {
        // Return limited info if blocked/expired, or just fail?
        // Let frontend handle status check, but maybe hide data?
        // identifying status is enough for frontend to show block screen
    }

    // Fetch Services
    $services = Db::fetchAll('SELECT id, name, description, duration_min AS duration, price FROM cp_agenda_services WHERE account_id = ? ORDER BY sort_order ASC', [$profile['id']]);
    foreach ($services as &$s) {
        $s['price'] = (float)$s['price'];
    }

    // Fetch Availability
    $availability = Db::fetch('SELECT working_hours, interval_minutes FROM cp_agenda_availability WHERE account_id = ?', [$profile['id']]);
    
    // Fetch Blocked Dates
    $blocked = Db::fetchAll('SELECT blocked_date as date, reason FROM cp_agenda_blocked_dates WHERE account_id = ?', [$profile['id']]);

    if ($availability) {
        $availability['workingHours'] = json_decode($availability['working_hours'] ?? '[]', true);
        unset($availability['working_hours']);
        $availability['blockedDates'] = $blocked;
        $availability['intervalMinutes'] = $availability['interval_minutes']; // normalized key
        unset($availability['interval_minutes']);
    } else {
        $availability = [
            'workingHours' => [], 
            'blockedDates' => $blocked, 
            'intervalMinutes' => 30
        ];
    }

    // Fetch Busy Slots (Future only, confirmed/pending)
    // We only need start_at and duration to block slots in frontend
    $appointments = Db::fetchAll("SELECT start_at AS startAt, duration, status FROM cp_agenda_appointments WHERE account_id = ? AND start_at >= DATE_SUB(NOW(), INTERVAL 1 DAY) AND status IN ('confirmed', 'pending')", [$profile['id']]);

    Response::ok([
        'profile' => $profile,
        'services' => $services,
        'availability' => $availability,
        'appointments' => $appointments
    ]);
}

Response::fail('Not Found', 404);
