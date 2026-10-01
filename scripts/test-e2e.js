// Full end-to-end test: Login via hosted Supabase Auth → call API with token → verify profile
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://127.0.0.1:3001';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

try {
  // 1. Login
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'teacher@classassist.demo',
    password: process.env.SEED_PASSWORD,
  });
  if (error) throw error;
  console.log('1. Login OK');

  // 2. Call /api/me with auth token
  const token = data.session.access_token;
  const meRes = await fetch(`${API_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const me = await meRes.json();
  if (!meRes.ok) throw new Error(me.error?.message || 'Failed to get profile');
  console.log('2. Profile OK');
  console.log('   Name:', me.name);
  console.log('   Role:', me.role);

  // 3. Call /api/classes
  const classesRes = await fetch(`${API_URL}/api/classes`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const classes = await classesRes.json();
  if (!classesRes.ok) throw new Error(classes.error?.message || 'Failed to get classes');
  console.log('3. Classes OK - found', classes.length, 'class(es)');
  if (classes.length > 0) console.log('   First class:', classes[0].name);

  console.log('\n✅ Full end-to-end test PASSED!');
} catch (e) {
  console.error('\n❌ Test FAILED:', e.message);
  process.exit(1);
}
