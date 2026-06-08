
const { createClient } = require('@supabase/supabase-js');

// Hardcoded para garantir execução sem depender de .env neste contexto de script isolado
const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
    const tables = ['profiles', 'services', 'availability', 'appointments', 'public_busy_slots'];

    for (const table of tables) {
        console.log(`\n--- Inspecting table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error querying ${table}:`, error.message);
        } else {
            if (data && data.length > 0) {
                console.log('Columns found:', Object.keys(data[0]).join(', '));
                console.log('Sample row:', JSON.stringify(data[0], null, 2));
            } else {
                console.log('Table accessible but empty.');
            }
        }
    }
}

inspectTables();
