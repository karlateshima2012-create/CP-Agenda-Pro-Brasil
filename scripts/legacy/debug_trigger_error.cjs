const { createClient } = require('@supabase/supabase-js');

// Configuração (Mesmas credenciais do app)
const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';
const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2'; // ID do profissional

async function debugInsert() {
    console.log('🐞 Iniciando Debug do Erro de Trigger...');

    // Login (necessário para RLS)
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'test_robot_1767531254314@example.com',
        password: 'Password123!'
    });
    if (loginError) { console.error('Erro Login:', loginError); return; }

    // Dados de teste
    const startAt = new Date();
    startAt.setDate(startAt.getDate() + 10); // Futuro distante
    startAt.setHours(10, 0, 0, 0);

    const payload = {
        user_id: USER_ID,
        client_name: 'Debug Trigger Client',
        client_phone: '11999999999',
        start_at: startAt.toISOString(),
        duration: 30,
        service_id: 4, // ID verificado via inspect_db (INT)
        service_name: 'Debug Service',
        status: 'pending'
    };

    console.log('Tentando inserir agendamento:', payload);

    const { data, error } = await supabase.from('appointments').insert(payload).select();

    if (error) {
        console.error('❌ ERRO CAPTURADO:');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Sucesso! Agendamento criado:', data);
        // Limpar
        if (data && data.length > 0) {
            await supabase.from('appointments').delete().eq('id', data[0].id);
        }
    }
}

debugInsert();
