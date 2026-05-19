import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { onValueCreated } from 'firebase-functions/v2/database';
import { buildStatsUpdate, sanitizeSubmission, validateSubmissionForTrustedStats } from './verification.js';

initializeApp();

export const onMatchResultSubmissionCreated = onValueCreated(
  {
    ref: '/matchResultSubmissions/{uid}/{matchId}',
    region: 'us-central1',
    instance: process.env.FIREBASE_DATABASE_INSTANCE || undefined,
  },
  async (event) => {
    const raw = event.data?.val();
    if (!raw) return;

    const db = getDatabase();
    const { uid, matchId } = event.params;
    const submissionRef = db.ref(`matchResultSubmissions/${uid}/${matchId}`);
    const safe = sanitizeSubmission(raw);
    const validation = validateSubmissionForTrustedStats(safe);
    const now = Date.now();

    if (!validation.valid) {
      await submissionRef.child('serverReview').set({
        status: 'rejected',
        reason: validation.errors,
        reviewedAt: now,
      });
      return;
    }

    const idempotencyRef = db.ref(`trustedStatsApplications/${safe.matchId}`);
    const claim = await idempotencyRef.transaction((current) => {
      if (current?.status === 'applied') return;
      return {
        status: 'processing',
        claimedAt: now,
        ownerUid: uid,
      };
    });

    if (!claim.committed) {
      await submissionRef.child('serverReview').set({
        status: 'duplicate',
        reviewedAt: now,
      });
      return;
    }

    const [winnerSnap, loserSnap] = await Promise.all([
      db.ref(`playerStats/${safe.winnerUid}`).get(),
      db.ref(`playerStats/${safe.loserUid}`).get(),
    ]);

    const winnerNext = buildStatsUpdate(winnerSnap.val() || {}, 'win', safe.endedAt, now);
    const loserNext = buildStatsUpdate(loserSnap.val() || {}, 'loss', safe.endedAt, now);

    await db.ref().update({
      [`playerStats/${safe.winnerUid}`]: winnerNext,
      [`playerStats/${safe.loserUid}`]: loserNext,
      [`matchResultSubmissions/${uid}/${matchId}/serverVerified`]: true,
      [`matchResultSubmissions/${uid}/${matchId}/trustedStatsApplied`]: true,
      [`matchResultSubmissions/${uid}/${matchId}/serverReview`]: {
        status: 'applied',
        reviewedAt: now,
      },
      [`trustedStatsApplications/${safe.matchId}`]: {
        status: 'applied',
        appliedAt: now,
        winnerUid: safe.winnerUid,
        loserUid: safe.loserUid,
      },
    });
  },
);
