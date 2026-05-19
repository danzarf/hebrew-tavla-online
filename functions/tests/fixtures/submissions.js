export function buildValidOnlineSubmission(overrides = {}) {
  return {
    matchId: 'm1',
    mode: 'online',
    winnerColor: 'white',
    loserColor: 'black',
    gameType: 'tavla',
    ruleset: 'hebrew-tavla',
    endedAt: 123,
    submittedAt: 124,
    clientSubmittedBy: 'u1',
    players: [{ uid: 'u1', color: 'white' }, { uid: 'u2', color: 'black' }],
    ...overrides,
  };
}

export function buildDuplicateMatchSubmission(base, overrides = {}) {
  return {
    ...base,
    trustedStatsApplied: false,
    serverVerified: false,
    submittedAt: Number(base.submittedAt || Date.now()) + 1,
    ...overrides,
  };
}

export function buildInvalidLocalSubmission(overrides = {}) {
  return buildValidOnlineSubmission({ mode: 'local', ...overrides });
}

export function buildMaliciousRewardSubmission(overrides = {}) {
  return buildValidOnlineSubmission({
    coins: 999,
    xp: 500,
    rewards: ['hack'],
    ...overrides,
  });
}

export function buildMismatchedSubmitterSubmission(overrides = {}) {
  return buildValidOnlineSubmission({
    clientSubmittedBy: 'different_submitter',
    ...overrides,
  });
}

export function buildMissingPlayersSubmission(overrides = {}) {
  return buildValidOnlineSubmission({ players: [{ uid: 'u1', color: 'white' }], ...overrides });
}
