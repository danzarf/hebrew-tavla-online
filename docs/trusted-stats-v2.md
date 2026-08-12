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
