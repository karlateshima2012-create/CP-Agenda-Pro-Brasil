<?php
require_once __DIR__ . '/../backend/api/lib/Db.php';

try {
    echo "--- INICIANDO CONFIGURAÇÃO DE ARQUIVAMENTO ---\n";
    
    // 1. Criar tabela de arquivo se não existir
    echo "Criando tabela de arquivo...\n";
    Db::query("CREATE TABLE IF NOT EXISTS cp_agenda_appointments_archive LIKE cp_agenda_appointments");
    
    // 2. Mover registros com mais de 6 meses
    echo "Movendo agendamentos com mais de 6 meses para o arquivo...\n";
    
    // Inicia transação para garantir que não percamos dados
    Db::query("START TRANSACTION");
    
    // Copia para o arquivo
    Db::query("
        INSERT INTO cp_agenda_appointments_archive 
        SELECT * FROM cp_agenda_appointments 
        WHERE start_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
    ");
    
    // Deleta da ativa
    Db::query("
        DELETE FROM cp_agenda_appointments 
        WHERE start_at < DATE_SUB(NOW(), INTERVAL 6 MONTH)
    ");
    
    Db::query("COMMIT");
    
    echo "✓ Arquivamento concluído com sucesso!\n";
} catch (Exception $e) {
    if (isset($db)) Db::query("ROLLBACK");
    echo "❌ ERRO: " . $e->getMessage() . "\n";
}
