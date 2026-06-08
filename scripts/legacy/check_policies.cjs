
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('🔍 Checking Policies...');

    // Consulta a tabela pg_policies para ver o que está definido
    // Supabase expõe isso via RPC ou consulta direta se permitido, 
    // mas como cliente anon talvez não consiga.
    // Vou testar comportamento: Tentar um DELETE e ver o count.

    const EMAIL = 'test_robot_1767531254314@example.com';
    const PASSWORD = 'Password123!';
    const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2';

    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

    // 1. Insert dummy
    const { data: ins, error: insErr } = await supabase.from('appointments').insert({
        user_id: USER_ID,
        client_name: 'Policy Test',
        start_at: new Date().toISOString(),
        duration: 30,
        status: 'pending'
    }).select();

    console.log('Insert Result:', insErr ? `Error: ${insErr.message}` : `Success (ID: ${ins?.[0]?.id})`);

    if (ins?.[0]?.id) {
        // 2. Try Delete
        const { count, error: delErr } = await supabase.from('appointments')
            .delete({ count: 'exact' })
            .eq('id', ins[0].id);

        console.log('Delete Result:', delErr ? `Error: ${delErr.message}` : `Success. Rows Affected: ${count}`);
    }
}

checkPolicies();
