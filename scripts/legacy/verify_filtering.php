<?php

// Simulate key logic from AppointmentsTab.tsx
date_default_timezone_set('Asia/Tokyo'); // JST

$today = new DateTime('now', new DateTimeZone('Asia/Tokyo'));
$tomorrow = clone $today;
$tomorrow->modify('+1 day');

echo "Today (JST): " . $today->format('Y-m-d') . "\n";
echo "Tomorrow (JST): " . $tomorrow->format('Y-m-d') . "\n";

$appointments = [
    ['id' => 1, 'startAt' => '2026-02-18T04:30:00', 'desc' => 'Feb 18 (Future)'],
    ['id' => 2, 'startAt' => '2026-02-17T03:30:00', 'desc' => 'Feb 17 (Future)'],
    ['id' => 3, 'startAt' => $today->format('Y-m-d').'T10:00:00', 'desc' => 'Today Match'],
    ['id' => 4, 'startAt' => $tomorrow->format('Y-m-d').'T10:00:00', 'desc' => 'Tomorrow Match'],
];

function isSameDay($d1, $d2) {
    return $d1->format('Y-m-d') === $d2->format('Y-m-d');
}

echo "\n--- Filter 'all' ---\n";
// Frontend: if (dateFilter === 'all') return true;
echo "Count: " . count($appointments) . "\n";

echo "\n--- Filter 'today' ---\n";
$todayList = array_filter($appointments, function($a) use ($today) {
    $d = new DateTime($a['startAt']); // Local parse
    // Force JST
    $d->setTimezone(new DateTimeZone('Asia/Tokyo'));
    return isSameDay($d, $today);
}); // Simplified JST logic
print_r($todayList);

echo "\n--- Filter 'tomorrow' ---\n";
$tomorrowList = array_filter($appointments, function($a) use ($tomorrow) {
    $d = new DateTime($a['startAt']);
    $d->setTimezone(new DateTimeZone('Asia/Tokyo'));
    return isSameDay($d, $tomorrow);
});
print_r($tomorrowList);
