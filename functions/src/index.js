import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { onValueCreated } from 'firebase-functions/v2/database';
import { processMatchResultSubmission } from './processor.js';

const TRUSTED_STATS_DATABASE_REGION = 'europe-west1';
const TRUSTED_STATS_DATABASE_INSTANCE = process.env.FIREBASE_DATABASE_INSTANCE || 'hebrew-tavla-online-default-rtdb';
const TRUSTED_STATS_DATABASE_URL = process.env.FIREBASE_DATABASE_URL
  || `https://${TRUSTED_STATS_DATABASE_INSTANCE}.${TRUSTED_STATS_DATABASE_REGION}.firebasedatabase.app`;

const app = initializeApp({ databaseURL: TRUSTED_STATS_DATABASE_URL });

export const onMatchResultSubmissionCreated = onValueCreated(
  {
    ref: '/matchResultSubmissions/{uid}/{matchId}',
    region: TRUSTED_STATS_DATABASE_REGION,
    instance: TRUSTED_STATS_DATABASE_INSTANCE,
  },
  async (event) => {
    const { uid, matchId } = event.params;
    await processMatchResultSubmission({
      db: getDatabase(app),
      raw: event.data?.val(),
      uid,
      matchId,
    });
  },
);
