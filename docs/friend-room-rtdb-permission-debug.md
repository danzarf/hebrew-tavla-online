# בדיקת Permission Denied בפתיחת חדר חברים

מסמך קצר לתקלה שבה לחיצה על `פתח חדר` מציגה:

```text
בעיה בפתיחת חדר. נסה שוב.
```

או:

```text
בעיה בפתיחת חדר: אין הרשאת Firebase לחדרים.
```

## מה הזרימה צריכה לעשות

1. האפליקציה מתחברת ל-Firebase Auth כאורח אנונימי.
2. `createRoom()` ממתין לסיום ה-auth הראשוני.
3. האפליקציה קוראת `rooms/{code}` כדי למצוא קוד פנוי.
4. האפליקציה כותבת את החדר ל-`rooms/{code}`.
5. המסך מציג קוד חדר אמיתי בן 4 ספרות.

## נתיבי Firebase שנדרשים לפתיחת חדר

```text
rooms/{code}
rooms/{code}/players
rooms/{code}/ready
```

ב-`database.rules.json` שבריפו, הנתיב `rooms` פתוח לקריאה וכתיבה כדי לשמור על מצב המשחק הקיים של חדרי חברים:

```json
"rooms": {
  ".read": true,
  ".write": true
}
```

זה לא נותן ללקוח לכתוב trusted stats. הנתיבים `playerStats` ו-`matchResultSubmissions` נשארים מוגנים בנפרד.

## ממצא חשוב מהבדיקה

בדיקת REST מול ה-Production RTDB:

```text
https://hebrew-tavla-online-default-rtdb.europe-west1.firebasedatabase.app/rooms/0000.json
```

חזרה עם:

```text
401 Permission denied
```

גם אחרי יצירת משתמש Firebase Anonymous תקין ושימוש ב-idToken שלו, קריאות לנתיבים כמו:

```text
profiles/{uid}
playerStats/{uid}
matchResultSubmissions/{uid}
rooms/0000
```

חזרו עם:

```text
Permission denied
```

לכן התקלה אינה placeholder UI ואינה קוד חדר חסר. ה-RTDB בפרודקשן דוחה את הגישה שהאפליקציה צריכה כדי ליצור חדר.

## מה לבדוק ב-Firebase Console

### 1. Realtime Database Rules

בדוק שהכללים שפורסמו בפרודקשן תואמים ל-`database.rules.json` מהריפו:

```text
Firebase Console -> Realtime Database -> Rules
```

ודא שבנתיב `rooms` יש:

```json
".read": true,
".write": true
```

אם הכללים בקונסול שונים מהקובץ בריפו, צריך לפרסם את `database.rules.json` לפרויקט:

```bash
firebase deploy --only database --project hebrew-tavla-online
```

אין להריץ את זה אם אינך בטוח שהקובץ המקומי הוא הכללים הרצויים.

### 2. App Check

בדוק אם App Check Enforcement מופעל עבור Realtime Database:

```text
Firebase Console -> App Check -> Realtime Database
```

אם Enforcement מופעל, האפליקציה חייבת לאתחל App Check ולשלוח token תקין בכל קריאת RTDB. כרגע `index.html` לא מאתחל App Check, ולכן Enforcement פעיל יכול לגרום ל-`Permission denied` גם כאשר Firebase Auth תקין.

אפשרויות תיקון:

- לכבות Enforcement ל-Realtime Database עד שמוסיפים App Check לאפליקציה.
- או להוסיף App Check בצורה מלאה ומבוקרת לאפליקציה, כולל provider מתאים לדומיינים של production/preview.

## מה לא לשנות

- לא לפתוח כתיבה ל-`playerStats`.
- לא לאפשר ללקוח לסמן `serverVerified` או `trustedStatsApplied`.
- לא לשנות gameplay, חוקים, קוביות, AI או כלכלה.
- לא לפרוס hosting או functions כדי לפתור את תקלה זו.

