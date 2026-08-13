const ACTION_TYPES = new Set(['sendRequest', 'acceptRequest', 'declineRequest', 'removeFriend']);

function safeString(value, max = 80) {
  const cleaned = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : '';
}

function validateSocialAction(raw = {}, actorUid) {
  const type = safeString(raw.type, 32);
  const targetUid = safeString(raw.targetUid, 128);
  const errors = [];
  if (!ACTION_TYPES.has(type)) errors.push('invalid-type');
  if (!actorUid) errors.push('missing-actor');
  if (!targetUid) errors.push('missing-target');
  if (actorUid && targetUid && actorUid === targetUid) errors.push('self-request');
  if (raw.actorUid && raw.actorUid !== actorUid) errors.push('actor-spoof');
  return { valid: errors.length === 0, errors, action: { type, targetUid } };
}

function requestEntry({ requesterUid, targetUid, status, now }) {
  return {
    requesterUid,
    targetUid,
    status,
    createdAt: now,
    updatedAt: now,
  };
}

function friendEntry(friendUid, now) {
  return {
    friendUid,
    createdAt: now,
    updatedAt: now,
  };
}

export async function processSocialAction({ db, raw, uid, actionId, now = Date.now } = {}) {
  const reviewedAt = now();
  const actionPath = `socialActions/${uid}/${actionId}`;
  const actionRef = db.ref(actionPath);
  const validation = validateSocialAction(raw, uid);

  await actionRef.child('serverReview').set({ status: 'processing', reviewedAt, processedAt: reviewedAt });

  if (!validation.valid) {
    await actionRef.child('serverReview').set({
      status: 'rejected',
      reason: validation.errors,
      reviewedAt,
      processedAt: reviewedAt,
    });
    return { status: 'rejected', reason: validation.errors };
  }

  const { type, targetUid } = validation.action;
  const requestPath = `friendRequests/${targetUid}/${uid}`;
  const outgoingPath = `outgoingFriendRequests/${uid}/${targetUid}`;
  const reverseRequestPath = `friendRequests/${uid}/${targetUid}`;
  const reverseOutgoingPath = `outgoingFriendRequests/${targetUid}/${uid}`;

  if (type === 'sendRequest') {
    const [friendSnap, requestSnap] = await Promise.all([
      db.ref(`friends/${uid}/${targetUid}`).get(),
      db.ref(requestPath).get(),
    ]);
    if (friendSnap.val()) {
      await actionRef.child('serverReview').set({ status: 'noop', reason: 'already-friends', reviewedAt, processedAt: reviewedAt });
      return { status: 'noop', reason: 'already-friends' };
    }
    if (requestSnap.val()?.status === 'pending') {
      await actionRef.child('serverReview').set({ status: 'noop', reason: 'already-pending', reviewedAt, processedAt: reviewedAt });
      return { status: 'noop', reason: 'already-pending' };
    }
    const entry = requestEntry({ requesterUid: uid, targetUid, status: 'pending', now: reviewedAt });
    await db.ref().update({
      [requestPath]: entry,
      [outgoingPath]: entry,
      [`${actionPath}/serverReview`]: { status: 'applied', reviewedAt, processedAt: reviewedAt },
    });
    return { status: 'applied' };
  }

  if (type === 'acceptRequest') {
    const pendingSnap = await db.ref(reverseRequestPath).get();
    if (pendingSnap.val()?.status !== 'pending') {
      await actionRef.child('serverReview').set({ status: 'rejected', reason: ['missing-pending-request'], reviewedAt, processedAt: reviewedAt });
      return { status: 'rejected', reason: ['missing-pending-request'] };
    }
    const accepted = requestEntry({ requesterUid: targetUid, targetUid: uid, status: 'accepted', now: reviewedAt });
    await db.ref().update({
      [reverseRequestPath]: accepted,
      [reverseOutgoingPath]: accepted,
      [`friends/${uid}/${targetUid}`]: friendEntry(targetUid, reviewedAt),
      [`friends/${targetUid}/${uid}`]: friendEntry(uid, reviewedAt),
      [`${actionPath}/serverReview`]: { status: 'applied', reviewedAt, processedAt: reviewedAt },
    });
    return { status: 'applied' };
  }

  if (type === 'declineRequest') {
    const pendingSnap = await db.ref(reverseRequestPath).get();
    if (pendingSnap.val()?.status !== 'pending') {
      await actionRef.child('serverReview').set({ status: 'rejected', reason: ['missing-pending-request'], reviewedAt, processedAt: reviewedAt });
      return { status: 'rejected', reason: ['missing-pending-request'] };
    }
    const declined = requestEntry({ requesterUid: targetUid, targetUid: uid, status: 'declined', now: reviewedAt });
    await db.ref().update({
      [reverseRequestPath]: declined,
      [reverseOutgoingPath]: declined,
      [`${actionPath}/serverReview`]: { status: 'applied', reviewedAt, processedAt: reviewedAt },
    });
    return { status: 'applied' };
  }

  await db.ref().update({
    [`friends/${uid}/${targetUid}`]: null,
    [`friends/${targetUid}/${uid}`]: null,
    [`${actionPath}/serverReview`]: { status: 'applied', reviewedAt, processedAt: reviewedAt },
  });
  return { status: 'applied' };
}
