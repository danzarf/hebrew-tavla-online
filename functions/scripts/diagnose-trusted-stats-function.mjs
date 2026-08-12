import { readFile } from 'node:fs/promises';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const DATABASE_URL = 'https://hebrew-tavla-online-default-rtdb.europe-west1.firebasedatabase.app';
const DEFAULT_TIMEOUT_MS = 120000;
const POLL_MS = 3000;

function argValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function diagnosticSubmission({ uid, matchId, now = Date.now() }) {
  const winnerUid = `${uid}_winner`;
  const loserUid = uid;
  return {
    matchId,
    mode: 'online',
    players: [
      { uid: winnerUid, color: 'black' },
      { uid: loserUid, color: 'white' },
    ],
    winnerColor: 'black',
    loserColor: 'white',
    winnerId: winnerUid,
    winnerUid,
    loserId: loserUid,
    loserUid,
    playerMatchStats: {
      [winnerUid]: { capturesMade: 3, capturesSuffered: 1 },
      [loserUid]: { capturesMade: 1, capturesSuffered: 3 },
    },
    endedAt: now,
    resultSource: 'diagnostic-workflow',
    gameType: 'tavla',
    ruleset: 'hebrew-tavla',
    finalStatus: 'completed',
    clientSubmittedBy: uid,
    serverVerified: false,
    trustedStatsApplied: false,
    submittedAt: now + 1,
  };
}

async function readExistingPayload(filePath) {
  if (!filePath) return null;
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function waitForServerReview(db, path, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const snap = await db.ref(`${path}/serverReview`).get();
    const value = snap.val();
    if (value?.status) return value;
    await sleep(POLL_MS);
  }
  return null;
}

const action = argValue('action', 'write-test');
const timeoutMs = Number(argValue('timeout-ms', DEFAULT_TIMEOUT_MS)) || DEFAULT_TIMEOUT_MS;
const uid = argValue('uid', `diagnostic-${Date.now()}`);
const matchId = argValue('match-id', `diagnostic-${Date.now()}`);
const payloadFile = argValue('payload-file');

const app = initializeApp({
  credential: applicationDefault(),
  databaseURL: DATABASE_URL,
});

const db = getDatabase(app);
const path = `matchResultSubmissions/${uid}/${matchId}`;

if (action === 'write-test') {
  const payload = await readExistingPayload(payloadFile) || diagnosticSubmission({ uid, matchId });
  await db.ref(path).set(payload);
  console.log(`Wrote diagnostic submission: ${path}`);
  console.log(`winnerUid=${payload.winnerUid}`);
  console.log(`loserUid=${payload.loserUid}`);
} else if (action === 'inspect-existing') {
  console.log(`Inspecting existing submission: ${path}`);
} else {
  throw new Error(`Unsupported action: ${action}`);
}

const serverReview = await waitForServerReview(db, path, timeoutMs);
const submission = (await db.ref(path).get()).val();

console.log(`Submission path: ${path}`);
console.log(`serverVerified=${submission?.serverVerified}`);
console.log(`trustedStatsApplied=${submission?.trustedStatsApplied}`);

if (!serverReview) {
  console.error(`No serverReview appeared within ${timeoutMs}ms.`);
  console.error(JSON.stringify({ path, keys: Object.keys(submission || {}) }, null, 2));
  process.exit(2);
}

console.log(`serverReview=${JSON.stringify(serverReview)}`);

const trustedApplication = (await db.ref(`trustedStatsApplications/${matchId}`).get()).val();
console.log(`trustedStatsApplications/${matchId}=${JSON.stringify(trustedApplication)}`);

if (submission?.winnerUid) {
  const winnerStats = (await db.ref(`playerStats/${submission.winnerUid}`).get()).val();
  console.log(`playerStats/${submission.winnerUid}=${JSON.stringify(winnerStats)}`);
}
if (submission?.loserUid) {
  const loserStats = (await db.ref(`playerStats/${submission.loserUid}`).get()).val();
  console.log(`playerStats/${submission.loserUid}=${JSON.stringify(loserStats)}`);
}
