export function getActionIdFromPath(path = '') {
  return String(path || '').split('/').filter(Boolean).at(-1) || '';
}

export async function convergePendingHostedInvite({
  socialState,
  isOnline = () => false,
  joinRoomByCode,
} = {}) {
  const inviteId = socialState?.pendingHostInviteId;
  if (!inviteId || isOnline()) return { joined: false, reason: inviteId ? 'already-online' : 'no-pending-host' };
  const invite = socialState.outgoingGameInvites?.[inviteId];
  if (!invite?.roomCode || !['pending', 'accepted'].includes(invite.status)) {
    return { joined: false, reason: 'not-ready' };
  }
  socialState.pendingHostInviteId = '';
  await joinRoomByCode(invite.roomCode);
  return { joined: true, roomCode: invite.roomCode };
}

export async function convergePendingAcceptedInvite({
  socialState,
  joinRoomByCode,
} = {}) {
  const inviteId = socialState?.pendingJoinInviteId;
  if (!inviteId) return { joined: false, reason: 'no-pending-join' };
  const invite = socialState.incomingGameInvites?.[inviteId];
  if (invite?.status !== 'accepted' || !invite.roomCode) return { joined: false, reason: 'not-accepted' };
  socialState.pendingJoinInviteId = '';
  await joinRoomByCode(invite.roomCode);
  return { joined: true, roomCode: invite.roomCode };
}
