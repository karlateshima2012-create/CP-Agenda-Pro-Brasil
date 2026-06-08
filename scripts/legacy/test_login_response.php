<?php
// scripts/test_login_response.php
// This script simulates a login to check the JSON structure

$url = 'https://cpagendapro.creativeprintjp.com/api/auth/login';
$email = 'suporte@creativeprintjp.com'; // Try a known user or create one?
// Actually we need a user with must_change_password = 1.
// Let's create a temp user logic or just check the code response structure simulation.
// Better: login as an existing user and check the structure keys, even if must_change_password is 0 (false).
// We want to see WHERE the key is.

$ch = curl_init($url);
$payload = json_encode(['email' => 'test_first_access@example.com', 'password' => 'password123']);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

echo "Login Response:\n";
echo $response . "\n\n";

$data = json_decode($response, true);
if (isset($data['data']['user']['must_change_password'])) {
    echo "✅ Found: data.user.must_change_password = " . ($data['data']['user']['must_change_password'] ? 'true' : 'false') . "\n";
} else {
    echo "❌ NOT FOUND at data.user.must_change_password\n";
}

if (isset($data['data']['must_change_password'])) {
    echo "⚠️ Found at root: data.must_change_password\n";
} else {
    echo "ℹ️ Not found at root: data.must_change_password (Expected if inside user)\n";
}
