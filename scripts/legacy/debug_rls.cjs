
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2';
const EMAIL = 'test_robot_1767531254314@example.com';
const PASSWORD = 'Password123!';

async function debugRLS() {
    await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

    const randomId = '00000000-0000-0000-0000-000000000000';

    const res = await supabase.from('profiles')
        .update({ company_name: 'HACKED' })
        .eq('id', randomId)
        .select('*', { count: 'exact', head: true });

    console.log('--- DEBUG RLS ---');
    console.log('Error:', res.error);
    console.log('Data:', res.data);
    console.log('Count:', res.count); // Checking if this is undefined or 0

    if (res.data.length === 0) console.log('✅ No rows updated (Safe).');
    else console.log('❌ Rows updated!');
}

debugRLS();
