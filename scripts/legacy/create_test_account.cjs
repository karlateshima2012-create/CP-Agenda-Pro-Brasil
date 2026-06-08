
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestAccount() {
    const email = `test_robot_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log(`🤖 Creating test user: ${email}`);

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                company_name: 'Robot Barber Shop',
                owner_name: 'Sr. Robô',
                plan_type: '12m' // Tenta forçar plano, mas trigger/default pode sobrescrever
            }
        }
    });

    if (authError) {
        console.error('❌ Auth Error:', authError.message);
        return;
    }

    const userId = authData.user?.id;
    console.log(`✅ User created! ID: ${userId}`);

    // Pequeno delay para triggers de banco rodarem (criação de profile)
    await new Promise(r => setTimeout(r, 2000));

    // 2. Setup Availability
    console.log('📅 Setting up availability...');
    const workingHours = [];
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    for (let i = 0; i < 7; i++) {
        workingHours.push({
            day: i,
            name: days[i],
            isWorking: true, // Trabalha todos os dias para teste fácil
            startTime: '08:00',
            endTime: '20:00'
        });
    }

    // Auth client já deve ter o token na sessão
    const { error: availError } = await supabase.from('availability').upsert({
        user_id: userId,
        working_hours: workingHours,
        interval_minutes: 60
    });

    if (availError) console.error('❌ Availability Error:', availError.message);
    else console.log('✅ Availability set.');

    // 3. Create Services
    console.log('✂️ Creating services...');
    const services = [
        { name: 'Corte Rápido', description: '30min', duration: 30, price: 30 },
        { name: 'Corte Detalhado', description: '60min', duration: 60, price: 50 },
        { name: 'Tratamento Vip', description: '120min', duration: 120, price: 100 }
    ];

    for (const svc of services) {
        const { error: svcError } = await supabase.from('services').insert({
            user_id: userId,
            ...svc
        });
        if (svcError) console.error(`❌ Service Error (${svc.name}):`, svcError.message);
        else console.log(`✅ Service '${svc.name}' created.`);
    }

    console.log('\n--- TEST DATA SUMMARY ---');
    console.log(`USER_ID: ${userId}`);
    console.log(`EMAIL: ${email}`);
    console.log(`PASSWORD: ${password}`);
    console.log('-------------------------');
}

setupTestAccount();
