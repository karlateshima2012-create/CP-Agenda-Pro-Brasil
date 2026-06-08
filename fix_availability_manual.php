<?php
require_once __DIR__ . '/backend/api/config.php';
require_once __DIR__ . '/backend/api/lib/Db.php';

$accountId = 5; // Assumindo que este é o seu account_id baseado no p=31 (usuário 31 -> conta 5)
// Vou verificar o ID correto antes de rodar
$user = Db::fetch('SELECT account_id FROM cp_agenda_users WHERE id = 31');
if ($user) {
    $accountId = $user['account_id'];
    echo "Identificada Conta ID: $accountId para o Usuário 31\n";
} else {
    die("Erro: Usuário 31 não encontrado.\n");
}

$workingHours = [
    ['day' => 'segunda', 'name' => 'Segunda-feira', 'isWorking' => false, 'startTime' => '19:00', 'endTime' => '22:00', 'start' => '19:00', 'end' => '22:00'],
    ['day' => 'terca', 'name' => 'Terça-feira', 'isWorking' => true, 'startTime' => '19:00', 'endTime' => '22:00', 'start' => '19:00', 'end' => '22:00'],
    ['day' => 'quarta', 'name' => 'Quarta-feira', 'isWorking' => true, 'startTime' => '19:00', 'endTime' => '22:00', 'start' => '19:00', 'end' => '22:00'],
    ['day' => 'quinta', 'name' => 'Quinta-feira', 'isWorking' => true, 'startTime' => '19:00', 'endTime' => '22:00', 'start' => '19:00', 'end' => '22:00'],
    ['day' => 'sexta', 'name' => 'Sexta-feira', 'isWorking' => true, 'startTime' => '19:00', 'endTime' => '22:00', 'start' => '19:00', 'end' => '22:00'],
    ['day' => 'sabado', 'name' => 'Sábado', 'isWorking' => true, 'startTime' => '09:00', 'endTime' => '18:00', 'start' => '09:00', 'end' => '18:00'],
    ['day' => 'domingo', 'name' => 'Domingo', 'isWorking' => false, 'startTime' => '09:00', 'endTime' => '13:00', 'start' => '09:00', 'end' => '13:00']
];

$jsonHours = json_encode($workingHours);

try {
    $res = Db::query('UPDATE cp_agenda_availability SET working_hours = ? WHERE account_id = ?', [$jsonHours, $accountId]);
    echo "Resultado do Update: " . ($res ? "Sucesso" : "Falha") . "\n";
    
    $check = Db::fetch('SELECT working_hours FROM cp_agenda_availability WHERE account_id = ?', [$accountId]);
    echo "Dados atuais no Banco: " . $check['working_hours'] . "\n";
} catch (Exception $e) {
    echo "ERRO: " . $e->getMessage() . "\n";
}
