<?php
// backend/migrate.php

require_once __DIR__ . '/api/config.php';
require_once __DIR__ . '/api/lib/Db.php';

// Security: CLI Only
if (php_sapi_name() !== 'cli') {
    die('Migrations can only be run from the command line.');
}

echo "Running Migrations...\n";

try {
    $pdo = Db::getInstance()->getPdo();
    
    // Create migrations table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");
    
    $executed = $pdo->query("SELECT migration FROM migrations")->fetchAll(PDO::FETCH_COLUMN);
    $files = glob(__DIR__ . '/database/migrations/*.sql');
    
    foreach ($files as $file) {
        $filename = basename($file);
        if (in_array($filename, $executed)) {
            continue;
        }
        
        echo "Migrating: $filename\n";
        $sql = file_get_contents($file);
        $pdo->exec($sql);
        
        $stmt = $pdo->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$filename]);
        echo "Done: $filename\n";
    }
    
    echo "All migrations applied.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
