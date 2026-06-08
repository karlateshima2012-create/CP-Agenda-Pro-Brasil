
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

const EMAIL = 'test_robot_1767531254314@example.com';
const PASSWORD = 'Password123!';
const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2';

async function authAndAdmin() {
    console.log('Testando Admin Actions (Simulado pelo Próprio User)...');

    // 1. Login
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
    if (loginErr) return console.error('Login Failed:', loginErr.message);

    // 2. Tentar Atualizar Status (Simulando Bloqueio)
    // O usuário está "se bloqueando", mas serve para testar que o campo é gravável.
    const { data: d1, error: e1 } = await supabase.from('profiles')
        .update({ account_status: 'blocked' }) // Status de bloqueio
        .eq('id', USER_ID)
        .select('account_status')
        .single();

    if (e1) console.error('Erro Update Status:', e1.message);
    else console.log(`✅ Status alterado para: ${d1.account_status}`);

    // 3. Tentar Renovar Plano
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2); // Data agressiva para notar diferença

    const { data: d2, error: e2 } = await supabase.from('profiles')
        .update({ plan_expires_at: nextYear.toISOString(), account_status: 'active' }) // Reativa e Renova
        .eq('id', USER_ID)
        .select('plan_expires_at, account_status')
        .single();

    if (e2) console.error('Erro Update Plano:', e2.message);
    else console.log(`✅ Plano renovado até: ${d2.plan_expires_at} (Status: ${d2.account_status})`);
}

authAndAdmin();
