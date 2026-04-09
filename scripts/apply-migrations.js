#!/usr/bin/env node
/**
 * Script para aplicar migrations via Supabase Management API.
 * Necessário: Personal Access Token (PAT) do Supabase (formato sbp_...)
 *
 * Uso: SUPABASE_PAT=sbp_... node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'ajwowcerbjquqaveqtlr';
const PAT = process.env.SUPABASE_PAT;

if (!PAT) {
  console.error('❌ Defina SUPABASE_PAT com seu Personal Access Token do Supabase.');
  console.error('   Gere em: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const migrations = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

async function runQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log(`🚀 Aplicando ${migrations.length} migrations...`);
  for (const file of migrations) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    process.stdout.write(`  → ${file} ... `);
    try {
      await runQuery(sql);
      console.log('✅');
    } catch (err) {
      console.log(`❌\n     ${err.message}`);
    }
  }
  console.log('✨ Concluído!');
})();
