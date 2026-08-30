/**
 * Supabase Storage Setup Script
 *
 * Creates the required storage buckets (avatars, songs) using the
 * Supabase JS client. Run this once after configuring your .env file.
 *
 * Usage:
 *   node scripts/setup-supabase.js
 *
 * For the profiles table and storage RLS policies, run the SQL in
 * supabase/schema.sql via the Supabase Dashboard SQL Editor.
 */

const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '..', '.env');
const exampleEnvPath = path.resolve(__dirname, '..', '.env.example');
const fs = require('fs');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const sep = trimmed.indexOf('=');
    if (sep < 1) return;
    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  });
}

loadEnv(envPath);
loadEnv(exampleEnvPath);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = [
  { id: 'avatars', public: true },
  { id: 'songs', public: true },
];

async function main() {
  console.log('Connecting to Supabase:', SUPABASE_URL);

  const { data: existing, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Failed to list buckets:', listError.message);
    process.exit(1);
  }

  const existingIds = new Set(existing.map((b) => b.id));
  console.log('Existing buckets:', [...existingIds].join(', ') || '(none)');

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`  ✓ ${bucket.id} — already exists`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
    });
    if (error) {
      console.error(`  ✗ ${bucket.id} — ${error.message}`);
    } else {
      console.log(`  + ${bucket.id} — created`);
    }
  }

  // Verify uploads work
  for (const bucket of BUCKETS) {
    const testBuf = Buffer.from('ping');
    const { error: upErr } = await supabase.storage
      .from(bucket.id)
      .upload('_test/ping.txt', testBuf, { contentType: 'text/plain', upsert: true });
    if (upErr) {
      console.error(`  ⚠ ${bucket.id} upload test failed: ${upErr.message}`);
    } else {
      console.log(`  ✓ ${bucket.id} upload test passed`);
      await supabase.storage.from(bucket.id).remove(['_test/ping.txt']);
    }
  }

  console.log('\nStorage buckets are ready.');
  console.log('\n─── Next step ───');
  console.log('Run the SQL in supabase/schema.sql via the Supabase Dashboard SQL Editor');
  console.log('to create the profiles table and storage RLS policies.');
  console.log('Dashboard URL: https://supabase.com/dashboard/project/<your-ref>/sql/new');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
