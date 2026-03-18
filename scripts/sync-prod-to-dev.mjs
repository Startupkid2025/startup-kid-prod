/**
 * Sync prod data → dev instance (last 7 days, with rate limiting).
 *
 * Usage: PROD_TOKEN=<token> node scripts/sync-prod-to-dev.mjs
 *        PROD_TOKEN=<token> DAYS=14 node scripts/sync-prod-to-dev.mjs
 */
import { createClient } from '@base44/sdk';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const PROD_TOKEN = process.env.PROD_TOKEN;
if (!PROD_TOKEN) {
  console.error('Set PROD_TOKEN env var');
  process.exit(1);
}

const prod = createClient({ appId: '68e295dfd1c97e3c8c54140e', serverUrl: 'https://base44.app', token: PROD_TOKEN, requiresAuth: false });
const dev  = createClient({ appId: '69b0312e53a24c6bc3f6f8f6', serverUrl: 'https://base44.app', requiresAuth: false });

const DUMP_DIR = '/tmp/prod-snapshot';
mkdirSync(DUMP_DIR, { recursive: true });

const DAYS = parseInt(process.env.DAYS || '7', 10);
const CUTOFF = new Date();
CUTOFF.setDate(CUTOFF.getDate() - DAYS);
const CUTOFF_ISO = CUTOFF.toISOString();

// Reference/config entities — always copy ALL records
const ALWAYS_FULL = new Set([
  'User', 'Group', 'Lesson', 'Teacher', 'MaintenanceMode',
  'LeaderboardKings', 'VocabularyWord', 'QuizQuestion',
]);

// Entities to sync
const ENTITIES = [
  'Group', 'Lesson', 'Teacher', 'MaintenanceMode',
  'ScheduledLesson', 'LessonParticipation',
  'LeaderboardEntry', 'LeaderboardKings', 'Investment',
  'VocabularyWord', 'WordProgress', 'MathProgress', 'QuizProgress', 'QuizQuestion',
  'DailyMarketPerformance', 'CoinLog', 'Post',
  'VocabularyWordSuggestion',
];
// Note: User is excluded — requires auth, handle separately

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample'];

function stripSystemFields(record) {
  const clean = {};
  for (const [k, v] of Object.entries(record)) {
    if (!SYSTEM_FIELDS.includes(k)) clean[k] = v;
  }
  return clean;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Rate-limited API call with retry
async function rateLimited(fn, label) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await fn();
      await sleep(200); // 200ms between calls
      return result;
    } catch (e) {
      if (e.message?.includes('429') || e.message?.includes('Rate limit')) {
        const wait = (attempt + 1) * 3000;
        console.log(`    ⏳ Rate limited on ${label}, waiting ${wait/1000}s...`);
        await sleep(wait);
      } else {
        throw e;
      }
    }
  }
  throw new Error(`Failed after 3 retries: ${label}`);
}

// ── Phase 1: Dump prod data ──
async function dumpProd() {
  console.log('=== Phase 1: Dumping prod data ===\n');

  for (const name of ENTITIES) {
    try {
      const all = await rateLimited(() => prod.entities[name].list(), `list ${name}`);
      let data;
      if (ALWAYS_FULL.has(name)) {
        data = all;
      } else {
        data = all.filter(r => {
          const d = r.created_date || r.updated_date || '';
          return d >= CUTOFF_ISO;
        });
      }
      writeFileSync(`${DUMP_DIR}/${name}.json`, JSON.stringify(data, null, 2));
      const suffix = ALWAYS_FULL.has(name) ? '' : ` (of ${all.length} total)`;
      console.log(`  ✓ ${name}: ${data.length} records${suffix}`);
    } catch (e) {
      console.log(`  ✗ ${name}: ${e.message?.slice(0, 80)}`);
    }
  }
  console.log('\nDump complete.\n');
}

// ── Phase 2: Import to dev (additive, no clearing) ──
async function importToDev() {
  console.log('=== Phase 2: Importing to dev ===\n');

  for (const name of ENTITIES) {
    const filePath = `${DUMP_DIR}/${name}.json`;
    if (!existsSync(filePath)) {
      console.log(`  - ${name}: no dump file, skipping`);
      continue;
    }

    const records = JSON.parse(readFileSync(filePath, 'utf8'));
    if (records.length === 0) {
      console.log(`  - ${name}: 0 records, skipping`);
      continue;
    }

    let created = 0;
    let errors = 0;

    // Process in batches of 5 with delays
    for (let i = 0; i < records.length; i++) {
      try {
        const clean = stripSystemFields(records[i]);
        await rateLimited(
          () => dev.entities[name].create(clean),
          `create ${name}[${i}]`
        );
        created++;
      } catch (e) {
        errors++;
        if (errors <= 2) {
          console.log(`    err: ${e.message?.slice(0, 80)}`);
        }
      }

      // Extra pause every 10 records
      if ((i + 1) % 10 === 0) {
        await sleep(1000);
      }
    }

    console.log(`  ✓ ${name}: ${created} created, ${errors} errors (of ${records.length})`);
  }
  console.log('');
}

async function main() {
  console.log(`🔄 Syncing prod → dev (last ${DAYS} days, since ${CUTOFF_ISO.split('T')[0]})\n`);

  await dumpProd();
  await importToDev();

  console.log('✅ Sync complete!');
  console.log(`Dump saved at ${DUMP_DIR}/`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
