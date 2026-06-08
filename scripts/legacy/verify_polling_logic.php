<?php
// Simulate the JS logic in PHP to verify the concept

$rawData = [
    [
        'id' => 1,
        'account_id' => 16,
        'start_at' => '2026-02-18 04:30:00',
        'status' => 'pending'
    ],
    [
        'id' => 2,
        'account_id' => 16,
        'start_at' => '2026-02-17 03:30:00',
        'status' => 'pending'
    ]
];

// 1. Simulate OLD polling logic (Direct assignment)
// The frontend expects 'startAt' (camelCase).
// If we assign rawData directly, 'startAt' is undefined.
$oldState = $rawData; 
// In JS: appt.startAt would be undefined.

echo "=== Scenario 1: OLD Polling Logic (Fail) ===\n";
$filteredOld = array_filter($oldState, function($a) {
    // JS Filter: if (!appt.startAt) return false;
    return isset($a['startAt']);
});
echo "Visible items after polling: " . count($filteredOld) . " (Expected: 0)\n";


// 2. Simulate NEW polling logic (With Mapping)
echo "\n=== Scenario 2: NEW Polling Logic (Pass) ===\n";
$mappedState = array_map(function($a) {
    return [
        'id' => $a['id'],
        'startAt' => str_replace(' ', 'T', $a['start_at']), // transform
        'status' => $a['status']
    ];
}, $rawData);

$filteredNew = array_filter($mappedState, function($a) {
    return isset($a['startAt']);
});
echo "Visible items after polling: " . count($filteredNew) . " (Expected: 2)\n";
print_r($filteredNew);
