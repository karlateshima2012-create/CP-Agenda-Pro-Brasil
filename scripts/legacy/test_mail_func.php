<?php
// Simple test script to run on server
// Usage: php test_mail_func.php <to_email>

if ($argc < 2) {
    die("Usage: php test_mail_func.php <to_email>\n");
}

$to = $argv[1];
$subject = "Test Email from Hostinger PHP";
$message = "Hello! This is a test email sent using PHP's mail() function.";
$headers = "From: noreply@creativeprintjp.com\r\n";

echo "Attempting to send email to $to...\n";

if (mail($to, $subject, $message, $headers)) {
    echo "SUCCESS: Mail accepted for delivery.\n";
} else {
    echo "FAILURE: Mail function returned false.\n";
}
