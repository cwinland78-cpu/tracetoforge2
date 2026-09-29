import { loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env };
const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_RC_API_KEY'];
const missing = required.filter(name => !env[name]?.trim());
if (missing.length) throw new Error('Missing public frontend build settings: ' + missing.join(', '));
if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.VITE_SUPABASE_URL)) throw new Error('Invalid public Supabase URL');
const role = JSON.parse(Buffer.from(env.VITE_SUPABASE_ANON_KEY.split('.')[1], 'base64url').toString()).role;
if (role !== 'anon') throw new Error('Frontend build requires the public anon key');
console.log('Required public frontend build settings verified.');
