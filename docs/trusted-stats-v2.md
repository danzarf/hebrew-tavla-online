# Trusted Stats V2

Trusted Stats V2 מוסיף סטטיסטיקות עשירות יותר לפרופיל השחקן.

הנתונים החדשים:

- `capturesMade` - כמה פעמים השחקן אכל אבן של היריב.
- `capturesSuffered` - כמה פעמים אכלו אבן של השחקן.
- `averageCapturesMadePerGame` - ממוצע אכילות למשחק.
- `averageCapturesSufferedPerGame` - ממוצע פעמים שאכלו אותי למשחק.

הנתונים נשמרים תחת:

```text
playerStats/{uid}
```

## איך סופרים אכילות

ה-client לא משנה את חוקי המשחק ולא משנה את המהלך עצמו.
הספירה מתבצעת רק אחרי שהמהלך הקיים כבר הופעל, לפי `move.hit`.

במשחק אונליין ה-client שולח בסיום המשחק:

```text
playerMatchStats/{uid}/capturesMade
playerMatchStats/{uid}/capturesSuffered
```

ה-Cloud Function מסננת את הנתונים כך שרק שני ה-UID-ים של השחקנים במשחק נספרים.
אם הנתונים חסרים, הם נספרים כ-0 כדי לשמור תאימות לאחור עם submissions ישנים.

## מה trusted ומה עדיין לא

העדכון ל-`playerStats` עדיין server-authoritative:

- client לא כותב ל-`playerStats`.
- client לא כותב ל-`trustedStatsApplications`.
- `trustedStatsApplications/{matchId}` עדיין מונע ספירה כפולה.
- השרת מחיל רק submissions שעוברות validation.

עם זאת, V2 עדיין לא עושה replay מלא של כל המהלכים על השרת.
כלומר `playerMatchStats` נשלח מה-client ומסונן על ידי השרת, אבל לא מוכח מחדש ממהלך-אחר-מהלך.
Replay מלא יכול להיות שלב עתידי אם נרצה אימות חזק יותר נגד client זדוני.

## בדיקה בלי משחק מלא

אחרי merge ו-deploy של הפונקציה:

```text
GitHub -> Actions -> Diagnose Trusted Stats Function -> Run workflow
action: write-test
branch: main
```

האבחון שולח נתוני capture לדוגמה, ואז צריך לראות ב-Firebase:

```text
serverReview.status = "applied"
playerStats/{winnerUid}/capturesMade
playerStats/{winnerUid}/capturesSuffered
playerStats/{winnerUid}/averageCapturesMadePerGame
playerStats/{winnerUid}/averageCapturesSufferedPerGame
```

## זיהוי משחקים חדשים ב-Firebase

ה-Cloud Function כותבת אינדקס קריא, server-only:

```text
recentMatches/{matchId}
```

שם קל יותר למצוא את המשחקים החדשים בלי לפתוח UID-ים ידנית תחת `matchResultSubmissions`.
רשומת V2 תקינה אמורה לכלול:

```text
statsSchemaVersion = 2
hasPlayerMatchStats = true
playerMatchStats/{uid}/capturesMade
playerMatchStats/{uid}/capturesSuffered
```

גם אם לא היו אכילות במשחק, `playerMatchStats` צריך להופיע עם אפסים לשני השחקנים.

רשומות בדיקה מסומנות כך:

```text
isDiagnostic = true
```

משחק אמיתי צריך להופיע עם:

```text
isDiagnostic = false
roomCode
winnerDisplayName
loserDisplayName
serverReviewStatus = applied
```

## אבחון מהיר

אחרי deploy של הפונקציה אפשר להריץ:

```text
GitHub -> Actions -> Diagnose Trusted Stats Function -> Run workflow
action: write-test
branch: main
```

האבחון ידפיס גם את:

```text
recentMatches/{matchId}
```

כדי לראות את המשחק האמיתי האחרון בלי לשחק שוב:

```text
GitHub -> Actions -> Diagnose Trusted Stats Function -> Run workflow
action: inspect-latest-real
branch: main
```

אם ב-`matchResultSubmissions` אין `statsSchemaVersion = 2`, כנראה ש-Vercel עדיין מריץ build ישן של ה-client.
אם יש `statsSchemaVersion = 2` אבל הכתיבה נדחית, צריך לוודא ש-RTDB rules החדשים שמאשרים את שדות V2 נפרסו.
