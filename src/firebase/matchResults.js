import {
  FORBIDDEN_MATCH_RESULT_FIELDS,
  sanitizeMatchResult,
  validateMatchResult,
} from '../product/matchResult.js';

export const MATCH_RESULT_SUBMISSIONS_PATH = 'matchResultSubmissions';
export const SAFE_MATCH_RESULT_SUBMISSION_FIELDS = Object.freeze([
  'matchId',
  'roomCode',
  'mode',
  'players',
  'winnerId',
  'winnerUid',
  'loserId',
  'loserUid',
  'winnerColor',
  'loserColor',
  'startedAt',
  'endedAt',
  'resultSource',
  'gameType',
  'ruleset',
  'finalStatus',
  'clientSubmittedBy',
  'serverVerified',
  'trustedStatsApplied',
  'submittedAt',
]);

export function matchResultSubmissionPath(uid, matchId) {
  if (!uid || !matchId) return null;
  return `${MATCH_RESULT_SUBMISSIONS_PATH}/${uid}/${matchId}`;
}

export function sanitizeMatchResultSubmission(matchResult = {}, { uid, now = Date.now } = {}) {
  if (!uid) return null;

  const safeResult = sanitizeMatchResult({ ...matchResult, clientSubmittedBy: uid });
  const submission = {
    ...safeResult,
    clientSubmittedBy: uid,
    serverVerified: false,
    trustedStatsApplied: false,
    submittedAt: now(),
  };

  for (const field of FORBIDDEN_MATCH_RESULT_FIELDS) {
    delete submission[field];
  }

  return Object.fromEntries(
    Object.entries(submission).filter(([key, value]) => SAFE_MATCH_RESULT_SUBMISSION_FIELDS.includes(key) && value !== null && value !== undefined),
  );
}

export async function submitUnverifiedMatchResult({
  database,
  ref,
  set,
  uid,
  matchResult,
  now = Date.now,
  logger = console,
} = {}) {
  if (!uid) return { skipped: true, reason: 'missing-uid' };
  if (!database || !ref || !set) return { skipped: true, reason: 'missing-database-dependency' };

  const baseResult = sanitizeMatchResult({ ...matchResult, clientSubmittedBy: uid });
  const validation = validateMatchResult(baseResult);
  if (!validation.valid) {
    return { skipped: true, reason: 'invalid-submission', errors: validation.errors };
  }

  const submission = sanitizeMatchResultSubmission(baseResult, { uid, now });
  if (!submission?.matchId) return { skipped: true, reason: 'missing-match-id' };

  const path = matchResultSubmissionPath(uid, submission.matchId);
  if (!path) return { skipped: true, reason: 'missing-path' };

  try {
    await set(ref(database, path), submission);
    return { skipped: false, path, payload: submission };
  } catch (error) {
    logger?.warn?.('Unverified match result submission failed; continuing without trusted stats updates.', error);
    return { skipped: true, reason: 'write-failed', error };
  }
}
