import { execFileSync } from 'node:child_process';
import { writeFile, access } from 'node:fs/promises';
try {
  await access('.env');
  console.log('.env already exists; left unchanged.');
} catch {
  const raw = execFileSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['supabase', 'status', '-o', 'json'],
    { encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const config = JSON.parse(raw.slice(raw.indexOf('{')));
  if (!config.DB_URL?.includes('127.0.0.1:55322'))
    throw new Error('Unexpected local Supabase instance.');
  await writeFile(
    '.env',
    [
      `DATABASE_URL=${config.DB_URL}`,
      `SUPABASE_URL=${config.API_URL}`,
      `SUPABASE_PUBLISHABLE_KEY=${config.PUBLISHABLE_KEY || config.ANON_KEY}`,
      `SUPABASE_SECRET_KEY=${config.SECRET_KEY || config.SERVICE_ROLE_KEY}`,
      'PORT=3001',
      'HOST=127.0.0.1',
      'ALLOW_SAMPLE_DRAFTS=true',
      'AI_BASE_URL=https://api.openai.com/v1',
      'AI_API_KEY=',
      'AI_MODEL=',
      'SEED_PASSWORD=ClassAssist-demo-2026!',
      '',
    ].join('\n'),
    { flag: 'wx' },
  );
  console.log('Created ignored .env for local Supabase. No keys printed.');
}
