# הרשאות Runtime ל-Trusted Stats Function

הפונקציה `onMatchResultSubmissionCreated` היא Cloud Functions Gen 2 function.
ב-Gen 2 הפונקציה רצה כ-Cloud Run service, ולכן יש הבדל בין שלושה חשבונות:

- חשבון ה-deploy שנמצא ב-GitHub secret.
- חשבון ה-build שבונה את הקונטיינר.
- חשבון ה-runtime שהפונקציה משתמשת בו בזמן שהיא כותבת ל-Realtime Database.

הפונקציה מוגדרת לרוץ כ:

```text
firebase-adminsdk-fbsvc@hebrew-tavla-online.iam.gserviceaccount.com
```

החשבון הזה חייב לקבל הרשאת כתיבה ל-Realtime Database, למשל:

```text
roles/firebasedatabase.admin
```

או הרשאת Firebase רחבה יותר שכבר כוללת כתיבה ל-RTDB:

```text
roles/firebase.admin
```

אם הפונקציה רצה עם חשבון Runtime שלא מורשה ל-RTDB, ה-trigger עדיין יכול לפעול, אבל הלוגים יראו שגיאה כמו:

```text
Provided authentication credentials for the app named "[DEFAULT]" are invalid.
transaction at /trustedStatsApplications/{matchId} failed: disconnect
PersistentConnection.onAuthRevoked_
```

במצב כזה הבעיה אינה ב-Eventarc, בנתיב ה-trigger, או ב-client payload.
הבעיה היא שה-Admin SDK בתוך הפונקציה לא מצליח להזדהות מול ה-RTDB בזמן ריצה.

אחרי שינוי הרשאות או שינוי service account בקוד צריך לפרוס מחדש רק את הפונקציה:

```text
GitHub -> Actions -> Deploy Trusted Stats Function -> Run workflow
```

אחרי deploy מוצלח אפשר לבדוק בלי משחק מלא:

```text
GitHub -> Actions -> Diagnose Trusted Stats Function -> Run workflow
action: write-test
branch: main
```

האבחון אמור ליצור רשומת בדיקה תחת `matchResultSubmissions`, ואז לראות:

```text
serverReview.status = "applied"
serverVerified = true
trustedStatsApplied = true
trustedStatsApplications/{matchId}
playerStats/{winnerUid}
playerStats/{loserUid}
```
