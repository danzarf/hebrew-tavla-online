export function getTrustedStatsRefreshFeedback({ result, isAnonymous = false, hasUid = false } = {}) {
  if (!hasUid) return { message: 'צריך להתחבר שוב כדי לרענן סטטיסטיקות.', tone: 'warning' };
  if (isAnonymous) return { message: 'צריך חשבון שמור כדי לרענן סטטיסטיקות.', tone: 'warning' };
  if (result?.skipped && result?.reason === 'read-failed') return { message: 'לא הצלחנו לרענן כרגע. אפשר לנסות שוב.', tone: 'warning' };
  if (result?.hasTrustedStats) return { message: 'הסטטיסטיקות עודכנו.', tone: 'success' };
  return { message: 'אין סטטיסטיקות מאומתות עדיין.', tone: '' };
}
