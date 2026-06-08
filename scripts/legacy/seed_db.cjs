
const { createClient } = require('@supabase/supabase-js');

// Hardcoded for test script
const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USER_ID = '0d520774-831b-47f2-b42a-296b5fb21cc0';

async function seedData() {
    console.log('🌱 Seeding user data...');

    // 1. Configurar Disponibilidade (Seg-Sex, 09:00 - 18:00)
    const workingHours = [];
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    for (let i = 0; i < 7; i++) {
        workingHours.push({
            day: i,
            name: days[i],
            isWorking: i >= 1 && i <= 5, // Seg a Sex
            startTime: '09:00',
            endTime: '18:00'
        });
    }

    // Upsert availability
    // Primeiro verifica se já existe para evitar erro de PK se insert falhar
    const { data: availData } = await supabase.from('availability').select('*').eq('user_id', TEST_USER_ID).single();

    let availError;
    if (!availData) {
        console.log('Inserting availability...');
        const res = await supabase.from('availability').insert({
            user_id: TEST_USER_ID,
            working_hours: workingHours,
            blocked_dates: [],
            interval_minutes: 60 // Intervalo de 1 hora para facilitar teste
        });
        availError = res.error;
    } else {
        console.log('Updating availability...');
        const res = await supabase.from('availability').update({
            working_hours: workingHours,
            interval_minutes: 60
        }).eq('user_id', TEST_USER_ID);
        availError = res.error;
    }

    if (availError) {
        console.error('Error seeding availability:', availError);
        // Se o erro for de RLS (Policy), vamos precisar de outra abordagem, mas vamos tentar
        if (availError.code === '42501') console.log('⚠️ Permissão negada. RLS pode estar prevenindo edição anônima.');
    } else {
        console.log('✅ Availability configurada.');
    }

    // 2. Criar Serviços
    // Remove serviços antigos (idealmente, mas talvez não tenhamos permissão de delete se não formos o dono logado)
    // Vamos apenas tentar inserir novos
    const services = [
        { name: 'Corte de Cabelo', description: 'Corte masculino e feminino', duration: 60, price: 50 },
        { name: 'Barba', description: 'Modelagem de barba', duration: 30, price: 30 },
        { name: 'Completo', description: 'Corte + Barba', duration: 90, price: 70 }
    ];

    for (const svc of services) {
        const { error } = await supabase.from('services').insert({
            user_id: TEST_USER_ID,
            ...svc
        });

        if (error) {
            console.error(`Error seeding service ${svc.name}:`, error.message);
        } else {
            console.log(`✅ Service '${svc.name}' criado.`);
        }
    }

    console.log('🌱 Seed completo.');
}

seedData();
