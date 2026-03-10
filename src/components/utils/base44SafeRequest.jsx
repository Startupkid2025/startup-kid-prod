// components/utils/base44SafeRequest.js
const inflight = new Map(); // key -> Promise
const cache = new Map();    // key -> { ts, ttlMs, data }
const queue = [];
let active = 0;
const MAX_CONCURRENCY = 6;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > v.ttlMs) { 
    cache.delete(key); 
    return null; 
  }
  return v.data;
}

function setCache(key, data, ttlMs) {
  cache.set(key, { ts: Date.now(), ttlMs, data });
}

async function runQueued(fn) {
  if (active >= MAX_CONCURRENCY) {
    await new Promise(resolve => queue.push(resolve));
  }
  active++;
  try { 
    return await fn(); 
  } finally {
    active--;
    const next = queue.shift();
    if (next) next();
  }
}

function isRateLimitError(err) {
  const status = err?.status || err?.response?.status;
  const msg = err?.message || err?.toString?.() || "";
  return status === 429 || msg.includes("Rate limit exceeded") || msg.includes("429");
}

function isPermanentError(err) {
  const status = err?.status || err?.response?.status;
  return status === 404 || status === 401 || status === 403;
}

export async function safeRequest(fn, {
  key,
  ttlMs = 0,
  retries = 2,
  baseDelayMs = 500,
} = {}) {
  if (!key) {
    // בלי key אין דה-דופליקציה, עדיין נריץ בתור כדי לא לעשות burst
    return runQueued(fn);
  }

  // Cache hit
  const cached = ttlMs ? getCache(key) : null;
  if (cached != null) {
    console.log(`✅ Cache hit for key: ${key}`);
    return cached;
  }

  // Single-flight
  if (inflight.has(key)) {
    console.log(`🔄 Reusing in-flight request for key: ${key}`);
    return inflight.get(key);
  }

  const p = (async () => {
    let attempt = 0;
    while (true) {
      try {
        const res = await runQueued(fn);
        if (ttlMs) setCache(key, res, ttlMs);
        return res;
      } catch (err) {
        // אם 429 ויש קאש, חוזרים לקאש במקום להמשיך להפציץ
        if (isRateLimitError(err)) {
          const fallback = ttlMs ? getCache(key) : null;
          if (fallback != null) {
            console.log(`⚠️ Rate limit but using cached fallback for key: ${key}`);
            return fallback;
          }
        }

        // Don't retry permanent errors (404, 401, 403)
        if (isPermanentError(err) || attempt >= retries) {
          if (attempt > 0) {
            console.error(`❌ Request failed after ${attempt + 1} attempts for key: ${key}`);
          }
          throw err;
        }

        const jitter = Math.floor(Math.random() * 400);
        const delay = baseDelayMs * (2 ** attempt) + jitter;
        console.log(`⏳ Rate limit / transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
        await sleep(delay);
        attempt++;
      }
    }
  })();

  inflight.set(key, p);
  try { 
    return await p; 
  } finally { 
    inflight.delete(key); 
  }
}