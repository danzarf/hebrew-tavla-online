import {
  buildReadableMatchDebugEntry,
  buildRecentMatchIndexEntry,
  buildStatsUpdate,
  sanitizeSubmission,
  validateSubmissionForTrustedStats,
} from './verification.js';
import { buildPlayerMatchHistoryUpdates } from './history.js';
import { buildPublicStatsProjection } from './publicProfile.js';

export function shouldProcessSubmission(raw) {
  return Boolean(raw && !raw.serverReview);
}

async function reserveReadableMatchNumber(db) {
  const result = await db.ref('debugMatchCounter').transaction((current) => {
    const currentNumber = Number(current) || 0;
    return currentNumber + 1;
  });
  return Number(result.snapshot?.val?.()) || 0;
}

export async function processMatchResultSubmission({ db, raw, uid, matchId, now = Date.now, logger = console } = {}) {
  if (!shouldProcessSubmission(raw)) return { status: 'skipped' };

  const reviewedAt = now();
  const submissionPath = `matchResultSubmissions/${uid}/${matchId}`;
  const submissionRef = db.ref(submissionPath);
  const safe = sanitizeSubmission(raw);

  try {
    await submissionRef.child('serverReview').set({
      status: 'processing',
      reviewedAt,
      processedAt: reviewedAt,
    });

    const validation = validateSubmissionForTrustedStats(safe, { pathUid: uid });
    if (!validation.valid) {
      await submissionRef.child('serverReview').set({
        status: 'rejected',
        reason: validation.errors,
        reviewedAt,
        processedAt: reviewedAt,
      });
      return { status: 'rejected', reason: validation.errors };
    }

    const idempotencyRef = db.ref(`trustedStatsApplications/${safe.matchId}`);
    const claim = await idempotencyRef.transaction((current) => {
      if (current?.status === 'applied') return;
      return {
        status: 'processing',
        claimedAt: reviewedAt,
        ownerUid: uid,
      };
    });

    if (!claim.committed) {
      await submissionRef.child('serverReview').set({
        status: 'duplicate',
        reviewedAt,
        processedAt: reviewedAt,
      });
      return { status: 'duplicate' };
    }

    const [winnerSnap, loserSnap] = await Promise.all([
      db.ref(`playerStats/${safe.winnerUid}`).get(),
      db.ref(`playerStats/${safe.loserUid}`).get(),
    ]);

    const winnerNext = buildStatsUpdate(
      winnerSnap.val() || {},
      'win',
      safe.endedAt,
      reviewedAt,
      safe.playerMatchStats?.[safe.winnerUid],
    );
    const loserNext = buildStatsUpdate(
      loserSnap.val() || {},
      'loss',
      safe.endedAt,
      reviewedAt,
      safe.playerMatchStats?.[safe.loserUid],
    );
    const matchNumber = await reserveReadableMatchNumber(db);
    const recentMatchEntry = buildRecentMatchIndexEntry(safe, 'applied', reviewedAt);
    const readableMatchEntry = buildReadableMatchDebugEntry(recentMatchEntry, matchNumber);
    const readableMatchKey = readableMatchEntry.matchNumberPadded;
    const latestDebugPath = recentMatchEntry.isDiagnostic ? 'debugLatestDiagnosticMatch' : 'debugLatestRealMatch';
    const playerMatchHistoryUpdates = buildPlayerMatchHistoryUpdates(safe, reviewedAt);

    await db.ref().update({
      [`playerStats/${safe.winnerUid}`]: winnerNext,
      [`playerStats/${safe.loserUid}`]: loserNext,
      [`publicProfiles/${safe.winnerUid}/stats`]: buildPublicStatsProjection(winnerNext),
      [`publicProfiles/${safe.winnerUid}/updatedAt`]: reviewedAt,
      [`publicProfiles/${safe.loserUid}/stats`]: buildPublicStatsProjection(loserNext),
      [`publicProfiles/${safe.loserUid}/updatedAt`]: reviewedAt,
      ...playerMatchHistoryUpdates,
      [`recentMatches/${safe.matchId}`]: recentMatchEntry,
      [`readableMatches/${readableMatchKey}`]: readableMatchEntry,
      debugLatestMatch: readableMatchEntry,
      [latestDebugPath]: readableMatchEntry,
      [`${submissionPath}/serverVerified`]: true,
      [`${submissionPath}/trustedStatsApplied`]: true,
      [`${submissionPath}/serverReview`]: {
        status: 'applied',
        reviewedAt,
        processedAt: reviewedAt,
      },
      [`trustedStatsApplications/${safe.matchId}`]: {
        status: 'applied',
        appliedAt: reviewedAt,
        winnerUid: safe.winnerUid,
        loserUid: safe.loserUid,
        playerMatchStats: safe.playerMatchStats,
        statsSchemaVersion: safe.statsSchemaVersion || 1,
      },
    });
    return { status: 'applied' };
  } catch (error) {
    logger?.error?.('Trusted stats submission processing failed.', { uid, matchId, error });
    await submissionRef.child('serverReview').set({
      status: 'error',
      reason: 'server-processing-failed',
      message: error?.message || 'unknown-error',
      reviewedAt,
      processedAt: reviewedAt,
    });
    throw error;
  }
}
