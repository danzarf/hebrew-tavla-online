export function updateSocialNotificationState(state, incomingCount, { hasReceivedSnapshot = false } = {}) {
  const count = Math.max(0, Number(incomingCount) || 0);
  if (hasReceivedSnapshot && !state.notificationHydrated) {
    state.lastIncomingCount = count;
    state.notificationHydrated = true;
    return { shouldToast: false, count };
  }
  const shouldToast = Boolean(state.notificationHydrated && count > (Number(state.lastIncomingCount) || 0));
  state.lastIncomingCount = count;
  return { shouldToast, count };
}
