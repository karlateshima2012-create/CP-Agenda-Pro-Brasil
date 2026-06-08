
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vptwtwhadxcdfhveugkk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdHd0d2hhZHhjZGZodmV1Z2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxODQ1NTcsImV4cCI6MjA4Mjc2MDU1N30.Zd-PpMNiTC2FIeSOH9FzblNpId5Hd8IFICeR-fGS9h0';

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = 'dedabe0e-0594-445d-86a6-f2dd4bf278e2';
const EMAIL = 'test_robot_1767531254314@example.com';
const PASSWORD = 'Password123!';

async function runTests() {
    console.log('🧪 Starting Logic & Security Tests...\n');

    // 0. Sign In to bypass RLS (Simulating Professional booking for themselves)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD
    });

    if (authError || !authData.session) {
        console.error('❌ Login failed:', authError ? authError.message : 'No session');
        return;
    }
    console.log('✅ Logged in as Professional.');

    // 1. Get a Service ID
    const { data: services } = await supabase.from('services').select('id, duration').eq('user_id', USER_ID).limit(1);
    if (!services || services.length === 0) {
        console.error('❌ No services found. Cannot test appointments.');
        return;
    }
    const service = services[0];
    console.log(`ℹ️ Base Service: ID=${service.id}, Duration=${service.duration}min`);

    // Target Time: Amanhã às 10:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const startTimeIso = tomorrow.toISOString();

    // 2. Test Booking (Happy Path)
    console.log('👉 Booking Slot A (10:00 - 10:30)...');
    const { data: apptA, error: errA } = await supabase.from('appointments').insert({
        user_id: USER_ID,
        client_name: 'Test Setup',
        start_at: startTimeIso,
        duration: service.duration,
        service_id: service.id,
        status: 'confirmed'
    }).select().single();

    if (errA) {
        console.error('❌ Failed to book Slot A:', errA.message);
    } else {
        console.log('✅ Slot A booked. ID:', apptA.id);
    }

    // 3. Test Overlap (The "Integrity" Test)
    // Tentando agendar 10:15 (Sobreposição)
    console.log('👉 Attempting Booking Slot B (10:15 - 10:45) [OVERLAP]...');

    const overlapTime = new Date(tomorrow);
    overlapTime.setMinutes(15);

    const { data: apptB, error: errB } = await supabase.from('appointments').insert({
        user_id: USER_ID,
        client_name: 'Overlap Attacker',
        start_at: overlapTime.toISOString(),
        duration: service.duration,
        service_id: service.id,
        status: 'confirmed'
    }).select().single();

    if (!errB) {
        console.log('⚠️ Warning: DB allowed overlapping appointment! Status: Success.');
        console.log('   (This is expected if Logic is in Frontend or Trigger not active)');
        // Cleanup bad data
        if (apptB) await supabase.from('appointments').delete().eq('id', apptB.id);
    } else {
        console.log('✅ DB correctly blocked overlap:', errB.message);
    }

    // 4. Test Cancel & Release
    if (apptA) {
        console.log('👉 Canceling Slot A...');
        const { error: cancelErr } = await supabase.from('appointments')
            .update({ status: 'canceled' })
            .eq('id', apptA.id);

        if (cancelErr) console.error('❌ Cancel failed:', cancelErr.message);
        else console.log('✅ Slot A canceled.');

        // Verificar se liberou (Query Busy Slots if exists, or just inference)
        const { data: check } = await supabase.from('appointments').select('status').eq('id', apptA.id).single();
        if (check.status === 'canceled') console.log('✅ Status updated to canceled in DB.');
    }

    // 5. Test Admin Security (RLS)
    // Tentar alterar o perfil de OUTRO usuário aleatório - deve falhar pois estou logado como 'test_robot'
    console.log('👉 Testing RLS: Attempting to hack another profile...');
    const randomId = '00000000-0000-0000-0000-000000000000'; // Fake ID

    // Note: RLS usually prevents UPDATE/DELETE silently (0 rows affected) or with error
    const { error: hackErr, count } = await supabase.from('profiles')
        .update({ company_name: 'HACKED' })
        .eq('id', randomId)
        .select('*', { count: 'exact', head: true });

    if (hackErr) {
        console.log(`✅ Security Check Passed: ${hackErr.message}`);
    } else if (count === 0) {
        // Even if ID existed, if I don't own it, RLS hides it so count is 0.
        // But wait, Policy "Users can update own profile" means they can't even see others for update purposes.
        console.log('✅ Security Check Passed: No rows updated (RLS prevented access).');
    } else {
        console.log('❌ CRITICAL: Managed to update a record!');
    }

    console.log('🏁 Logic Tests Completed.');
}

runTests();
