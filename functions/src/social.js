const ACTION_TYPES = new Set([
  'sendRequest',
  'acceptRequest',
  'declineRequest',
  'removeFriend',
  'sendGameInvite',
  'acceptGameInvite',
  'declineGameInvite',
  'cancelGameInvite',
]);

const GAME_INVITE_TTL_MS = 10 * 60 * 1000;

function safeString(value, max = 80) {
  const cleaned = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : '';
}

function validateSocialAction(raw = {}, actorUid) {
  const type = safeString(raw.type, 32);
  const targetUid = safeString(raw.targetUid, 128);
  const inviteId = safeString(raw.inviteId, 128);
  const inviteKind = safeString(raw.inviteKind, 32) || 'game';
  const previousMatchId = safeString(raw.previousMatchId, 80);
  const errors = [];
  if (!ACTION_TYPES.has(type)) errors.push('invalid-type');
  if (!actorUid) errors.push('missing-actor');
  if (!targetUid) errors.push('missing-target');
  if (actorUid && targetUid && actorUid === targetUid) errors.push('self-request');
  if (raw.actorUid && raw.actorUid !== actorUid) errors.push('actor-spoof');
  if ((type === 'acceptGameInvite' || type === 'declineGameInvite' || type === 'cancelGameInvite') && !inviteId) {
    errors.push('missing-invite');
  }
  return { valid: errors.length === 0, errors, action: { type, targetUid, inviteId, inviteKind, previousMatchId } };
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

function publicName(profile, fallback) {
  return safeString(profile?.displayName, 18) || fallback;
}

function publicAvatar(profile) {
  return safeString(profile?.avatarPreference, 40) || 'default';
}

async function readPublicProfile(db, uid) {
  const snap = await db.ref(`publicProfiles/${uid}`).get();
  return snap.val() || {};
}

async function hasRecentMatchWith(db, uid, targetUid, previousMatchId) {
  if (!previousMatchId) return false;
  const snap = await db.ref(`playerMatchHistory/${uid}/${previousMatchId}`).get();
  const entry = snap.val();
  return entry?.opponentUid === targetUid;
}

async function generateRoomCode(db) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await db.ref(`rooms/${code}`).get();
    if (!snap.val()) return code;
  }
  throw new Error('could-not-generate-room-code');
}

function inviteEntry({
  inviteId,
  senderUid,
  targetUid,
  senderProfile,
  targetProfile,
  roomCode,
  inviteKind,
  previousMatchId,
  createdAt,
  expiresAt,
  status = 'pending',
} = {}) {
  return {
    inviteId,
    senderUid,
    targetUid,
    senderDisplayName: publicName(senderProfile, 'שחקן'),
    targetDisplayName: publicName(targetProfile, 'יריב'),
    senderAvatarPreference: publicAvatar(senderProfile),
    targetAvatarPreference: publicAvatar(targetProfile),
    roomCode,
    inviteKind: inviteKind === 'rematch' ? 'rematch' : 'game',
    previousMatchId: previousMatchId || null,
    status,
    createdAt,
    updatedAt: createdAt,
    expiresAt,
  };
}

function roomEntry({ roomCode, senderUid, targetUid, senderProfile, createdAt, inviteId, inviteKind, previousMatchId }) {
  return {
    roomCode,
    createdAt,
    updatedAt: createdAt,
    diceMode: 'manual',
    inviteFor: targetUid,
    gameInviteId: inviteId,
    rematch: inviteKind === 'rematch' ? {
      rematchOf: previousMatchId || null,
      requestedBy: senderUid,
      requestedFor: targetUid,
      requestedAt: createdAt,
    } : null,
    players: {
      human: {
        id: senderUid,
        uid: senderUid,
        name: publicName(senderProfile, 'שחקן'),
        connected: true,
      },
      computer: null,
    },
    ready: { human: false, computer: false },
    game: null,
    reaction: null,
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

  const { type, targetUid, inviteId, inviteKind, previousMatchId } = validation.action;
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

  if (type === 'sendGameInvite') {
    const [friendSnap, recentOk, existingPendingSnap, senderProfile, targetProfile] = await Promise.all([
      db.ref(`friends/${uid}/${targetUid}`).get(),
      hasRecentMatchWith(db, uid, targetUid, previousMatchId),
      db.ref(`outgoingGameInvites/${uid}`).get(),
      readPublicProfile(db, uid),
      readPublicProfile(db, targetUid),
    ]);
    const isAllowed = Boolean(friendSnap.val()) || (inviteKind === 'rematch' && recentOk);
    if (!isAllowed) {
      await actionRef.child('serverReview').set({ status: 'rejected', reason: ['invite-not-allowed'], reviewedAt, processedAt: reviewedAt });
      return { status: 'rejected', reason: ['invite-not-allowed'] };
    }
    const duplicate = Object.values(existingPendingSnap.val() || {}).find(invite =>
      invite?.targetUid === targetUid
      && invite?.status === 'pending'
      && Number(invite?.expiresAt || 0) > reviewedAt
      && invite?.inviteKind === (inviteKind === 'rematch' ? 'rematch' : 'game')
    );
    if (duplicate) {
      await actionRef.child('serverReview').set({
        status: 'noop',
        reason: 'already-pending-invite',
        inviteId: duplicate.inviteId,
        roomCode: duplicate.roomCode,
        reviewedAt,
        processedAt: reviewedAt,
      });
      return { status: 'noop', reason: 'already-pending-invite', inviteId: duplicate.inviteId, roomCode: duplicate.roomCode };
    }
    const code = await generateRoomCode(db);
    const id = actionId;
    const entry = inviteEntry({
      inviteId: id,
      senderUid: uid,
      targetUid,
      senderProfile,
      targetProfile,
      roomCode: code,
      inviteKind,
      previousMatchId,
      createdAt: reviewedAt,
      expiresAt: reviewedAt + GAME_INVITE_TTL_MS,
    });
    await db.ref().update({
      [`rooms/${code}`]: roomEntry({ roomCode: code, senderUid: uid, targetUid, senderProfile, createdAt: reviewedAt, inviteId: id, inviteKind, previousMatchId }),
      [`gameInvites/${targetUid}/${id}`]: entry,
      [`outgoingGameInvites/${uid}/${id}`]: entry,
      [`${actionPath}/serverReview`]: { status: 'applied', inviteId: id, roomCode: code, reviewedAt, processedAt: reviewedAt },
    });
    return { status: 'applied', inviteId: id, roomCode: code };
  }

  if (type === 'acceptGameInvite' || type === 'declineGameInvite' || type === 'cancelGameInvite') {
    const inviteTargetUid = type === 'cancelGameInvite' ? targetUid : uid;
    const senderUid = type === 'cancelGameInvite' ? uid : targetUid;
    const invitePath = `gameInvites/${inviteTargetUid}/${inviteId}`;
    const outgoingInvitePath = `outgoingGameInvites/${senderUid}/${inviteId}`;
    const inviteSnap = await db.ref(invitePath).get();
    const invite = inviteSnap.val();
    if (!invite || invite.senderUid !== senderUid || invite.targetUid !== inviteTargetUid) {
      await actionRef.child('serverReview').set({ status: 'rejected', reason: ['missing-invite'], reviewedAt, processedAt: reviewedAt });
      return { status: 'rejected', reason: ['missing-invite'] };
    }
    if (invite.status !== 'pending') {
      await actionRef.child('serverReview').set({ status: 'noop', reason: 'invite-already-handled', reviewedAt, processedAt: reviewedAt });
      return { status: 'noop', reason: 'invite-already-handled' };
    }
    if (type !== 'cancelGameInvite' && Number(invite.expiresAt || 0) <= reviewedAt) {
      await db.ref().update({
        [`${invitePath}/status`]: 'expired',
        [`${invitePath}/updatedAt`]: reviewedAt,
        [`${outgoingInvitePath}/status`]: 'expired',
        [`${outgoingInvitePath}/updatedAt`]: reviewedAt,
        [`${actionPath}/serverReview`]: { status: 'rejected', reason: ['invite-expired'], reviewedAt, processedAt: reviewedAt },
      });
      return { status: 'rejected', reason: ['invite-expired'] };
    }
    if (type === 'declineGameInvite' || type === 'cancelGameInvite') {
      const status = type === 'cancelGameInvite' ? 'cancelled' : 'declined';
      await db.ref().update({
        [`${invitePath}/status`]: status,
        [`${invitePath}/updatedAt`]: reviewedAt,
        [`${outgoingInvitePath}/status`]: status,
        [`${outgoingInvitePath}/updatedAt`]: reviewedAt,
        [`${actionPath}/serverReview`]: { status: 'applied', reviewedAt, processedAt: reviewedAt },
      });
      return { status: 'applied' };
    }
    const roomSnap = await db.ref(`rooms/${invite.roomCode}`).get();
    const room = roomSnap.val();
    if (!room || room.players?.computer) {
      await db.ref().update({
        [`${invitePath}/status`]: 'stale',
        [`${invitePath}/updatedAt`]: reviewedAt,
        [`${outgoingInvitePath}/status`]: 'stale',
        [`${outgoingInvitePath}/updatedAt`]: reviewedAt,
        [`${actionPath}/serverReview`]: { status: 'rejected', reason: ['room-unavailable'], reviewedAt, processedAt: reviewedAt },
      });
      return { status: 'rejected', reason: ['room-unavailable'] };
    }
    const targetProfile = await readPublicProfile(db, uid);
    await db.ref().update({
      [`rooms/${invite.roomCode}/players/computer`]: {
        id: uid,
        uid,
        name: publicName(targetProfile, 'יריב'),
        connected: true,
      },
      [`rooms/${invite.roomCode}/ready/computer`]: false,
      [`rooms/${invite.roomCode}/updatedAt`]: reviewedAt,
      [`${invitePath}/status`]: 'accepted',
      [`${invitePath}/acceptedAt`]: reviewedAt,
      [`${invitePath}/updatedAt`]: reviewedAt,
      [`${outgoingInvitePath}/status`]: 'accepted',
      [`${outgoingInvitePath}/acceptedAt`]: reviewedAt,
      [`${outgoingInvitePath}/updatedAt`]: reviewedAt,
      [`${actionPath}/serverReview`]: { status: 'applied', roomCode: invite.roomCode, reviewedAt, processedAt: reviewedAt },
    });
    return { status: 'applied', roomCode: invite.roomCode };
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
