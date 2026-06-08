
const { createClient } = require('@supabase/supabase-js');
// @ts-ignore
const dotenv = require('dotenv');

// Config manual para garantir leitura correta
const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTestUser() {
    try {
        // Busca o primeiro perfil que não seja suporte (se houver) ou qualquer um
        const { data, error } = await supabase
            .from('profiles')
            .select('id, company_name')
            .limit(1)
            .single();

        if (error) {
            console.error('Erro ao buscar usuário:', error.message);
        } else {
            console.log(`TEST_USER_ID=${data.id}`);
            console.log(`TEST_USER_NAME=${data.company_name}`);
        }
    } catch (err) {
        console.error('Erro de execução:', err);
    }
}

getTestUser();
