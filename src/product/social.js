import { sanitizeAvatarPreference, sanitizeDisplayName } from '../firebase/profile.js';
import { sanitizePlayerMatchHistory } from './matchHistory.js';

function safeUid(value) {
  return String(value || '').trim();
}

function safeCounter(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.floor(num);
}

function safeWinRate(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(100, Math.round(num * 10) / 10);
}

export function sanitizePublicProfile(raw = {}, uidFallback = '') {
  const uid = safeUid(raw.uid || uidFallback);
  return {
    uid,
    displayName: sanitizeDisplayName(raw.displayName, { fallbackName: 'יריב' }),
    avatarPreference: sanitizeAvatarPreference(raw.avatarPreference),
    stats: {
      gamesPlayed: safeCounter(raw.stats?.gamesPlayed),
      wins: safeCounter(raw.stats?.wins),
      winRate: safeWinRate(raw.stats?.winRate),
      currentStreak: safeCounter(raw.stats?.currentStreak),
      bestStreak: safeCounter(raw.stats?.bestStreak),
      lastPlayedAt: raw.stats?.lastPlayedAt || null,
    },
  };
}

export function buildRecentOpponents(history = [], publicProfiles = {}, { limit = 10 } = {}) {
  const seen = new Set();
  return sanitizePlayerMatchHistory(history, { limit: 50 })
    .filter(entry => entry.opponentUid && !entry.opponentUid.startsWith('diagnostic-'))
    .filter((entry) => {
      if (seen.has(entry.opponentUid)) return false;
      seen.add(entry.opponentUid);
      return true;
    })
    .slice(0, limit)
    .map((entry) => {
      const rawProfile = publicProfiles[entry.opponentUid] || null;
      const profile = sanitizePublicProfile(rawProfile || { displayName: entry.opponentDisplayName }, entry.opponentUid);
      return {
        uid: entry.opponentUid,
        displayName: profile.displayName,
        avatarPreference: profile.avatarPreference,
        lastResult: entry.result,
        lastPlayedAt: entry.endedAt || entry.processedAt,
        capturesMade: entry.capturesMade,
        capturesSuffered: entry.capturesSuffered,
        stats: profile.stats,
      };
    });
}

export function summarizeFriendshipState({ uid, friends = {}, incomingRequests = {}, outgoingRequests = {} } = {}) {
  if (!uid) return 'none';
  if (friends?.[uid]) return 'friends';
  if (incomingRequests?.[uid]?.status === 'pending') return 'incoming';
  if (outgoingRequests?.[uid]?.status === 'pending') return 'outgoing';
  return 'none';
}

export function buildSocialViewModel({
  friends = {},
  incomingRequests = {},
  outgoingRequests = {},
  publicProfiles = {},
  recentOpponents = [],
  actionBusy = false,
  message = '',
} = {}) {
  const friendRows = Object.keys(friends || {}).map((uid) => {
    const profile = sanitizePublicProfile(publicProfiles[uid] || {}, uid);
    return {
      uid,
      displayName: profile.displayName,
      avatarPreference: profile.avatarPreference,
      statsText: `${profile.stats.gamesPlayed} משחקים · ${profile.stats.winRate}% ניצחונות`,
    };
  });
  const incomingRows = Object.values(incomingRequests || {})
    .filter(request => request?.status === 'pending')
    .map(request => ({
      uid: request.requesterUid,
      displayName: sanitizePublicProfile(publicProfiles[request.requesterUid] || {}, request.requesterUid).displayName,
    }));

  return {
    friendsCount: friendRows.length,
    friendRows,
    incomingRows,
    outgoingCount: Object.values(outgoingRequests || {}).filter(request => request?.status === 'pending').length,
    recentOpponents,
    actionBusy,
    message,
    emptyFriendsText: 'עדיין אין לך חברים.',
    recentOpponentsTitle: 'שיחקת לאחרונה נגד',
  };
}
