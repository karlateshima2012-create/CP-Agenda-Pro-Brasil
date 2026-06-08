const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🔧 Aplicando correção de Trigger (DELETE Sync)...');

    // 1. Ler SQL
    const sqlPath = path.join(__dirname, 'fix_sync_trigger.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 2. Executar via RPC (assumindo que temos uma função exec ou usamos pgAdmin, mas aqui vamos tentar direto ou assumir que o usuário vai rodar no dashboard)
    // Wait, we don't have direct SQL exec capability via JS client without a helper function on DB.
    // However, we can use the 'inspection' trick: create a function if needed, OR just assume I need to tell the user to run it.
    // BUT I have been running SQL via 'verify_patch.cjs'? No, verify_patch just runs inserts.
    // I previously created `database_setup.sql`. Did I run it? No, I likely used a tool or established a `exec_sql` function.
    // Let's check `scripts/debug_rls.cjs` or similar. They all rely on client calls.
    // Without `exec_sql`, I cannot change the trigger from here.

    // HOWEVER, I can simulated it by "Re-creating" the function if I have the rights?
    // The Anon key has limited rights. I likely need `service_role` key if I want to run DDL.
    // The user provided `supabaseKey` (Anon).

    // Let's assume I CANNOT run DDL from here directly without `exec_sql` RPC or Service Key.
    // BUT I can try to use a "Supabase Function" if one exists? No.

    // Okay, I will try to use the `postgres_query` or similar tool if available? No.

    // WAIT. I used `run_command` in `database_setup.sql`? No, I wrote it to a file.
    // Earlier in the conversation, I might have noted how to run SQL.
    // If I can't run SQL, I must instruct user.
    // BUT I am in AGENTIC mode. I should try to solve it.

    // I'll try to use the `exec_sql` function if it exists (common pattern).
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.error('❌ Erro: Função RPC exec_sql não existe. Não é possível rodar SQL direto.');
            console.log('⚠️ POR FAVOR, EXECUTE O CONTEÚDO DE `scripts/fix_sync_trigger.sql` NO EDITOR SQL DO SUPABASE DASHBOARD.');
            process.exit(1);
        }
        console.error('❌ Erro ao executar SQL:', error);
    } else {
        console.log('✅ Trigger atualizado com sucesso!');
    }

    // 3. Verificação
    console.log('\n🕵️ Verificando Correção...');
    const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2'; // ID fixo usado nos testes
    const now = new Date();
    const startAt = new Date(now.getTime() + 86400000).toISOString(); // Amanhã

    // Criar
    const { data: newAppt } = await supabase.from('appointments').insert({
        user_id: USER_ID, client_name: 'Teste Delete',
        start_at: startAt, duration: 30, service_id: 'e63f9156-f61b-4394-9430-8182281a8b11', status: 'pending' // ID de serviço qualquer ou mock
    }).select().single();

    if (!newAppt) { console.log('⚠️ Falha ao criar agendamento de teste (Verifique Service ID).'); return; }

    // Verificar se existe em public_busy_slots
    const { data: busyBefore } = await supabase.from('public_busy_slots').select('*').eq('appointment_id', newAppt.id);
    console.log(`[1] Criado. Busy Slot existe? ${busyBefore.length > 0 ? 'SIM' : 'NÃO (Erro?)'}`);

    // Deletar
    await supabase.from('appointments').delete().eq('id', newAppt.id);

    // Verificar se sumiu
    const { data: busyAfter } = await supabase.from('public_busy_slots').select('*').eq('appointment_id', newAppt.id);
    console.log(`[2] Deletado. Busy Slot existe? ${busyAfter.length > 0 ? 'AINDA EXISTE (FALHA)' : 'SUMIU (SUCESSO)'}`);
}

run();
