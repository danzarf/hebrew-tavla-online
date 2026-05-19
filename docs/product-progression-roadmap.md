# Product Progression Roadmap ו-Security Contract

מסמך זה מגדיר את כיוון המוצר הבא עבור ששבש טורקי אונליין לפני שמוסיפים Auth, פרופיל שחקן, XP, coins, פרסים יומיים או אפליקציית מובייל.

המטרה היא להפוך את המשחק ממסך משחק בודד למוצר אונליין אמיתי, בלי לסכן את המשחק היציב שכבר עובד.

## החלטות נוכחיות מחייבות

- הלוח הירוק הנוכחי הוא גרסת ה-gameplay היציבה והמועדפת.
- לא ממזגים את ה-PR של הלוח החום.
- לא ממזגים את ה-PR הניסיוני והמבולגן של לוח 3D.
- לא ממשיכים כרגע עבודת visual board או 3D board.
- לא משנים כרגע את חוקי המשחק, AI, קוביות, Undo, End Turn או סנכרון חדרי אונליין.
- לא מוסיפים עדיין coins, XP, statistics, daily wheel או rewards.
- לא מיישמים כלכלה client-only אלא אם היא מסומנת במפורש כ-prototype זמני ולא אמין.

## מצב המוצר הנוכחי

הפרויקט הוא משחק ששבש טורקי אונליין בדפדפן. המשחק כבר כולל gameplay עובד מול מחשב וחדרי אונליין מול חבר, אבל עדיין אינו מוצר מלא עם חשבונות, פרופיל שחקן, התקדמות, כלכלה או rewards.

`index.html` עדיין משמש כנקודת הכניסה המרכזית והרגישה של המשחק, ולכן כל שינוי מוצרי צריך להיעשות בהדרגה, עם מינימום מגע ב-gameplay UI ובאזורי Firebase הקיימים.

## מה כבר קיים

- משחק מול מחשב.
- משחק אונליין מול חבר דרך Firebase Realtime Database.
- פתיחת חדר עם קוד בן 4 ספרות.
- הצטרפות לחדר לפי קוד.
- שם שחקן / אורח בסיסי עבור חדרי אונליין.
- מזהה שחקן מקומי שנשמר ב-localStorage.
- מצב ready לשני שחקנים לפני פתיחת משחק אונליין.
- גלגולת פתיחה שקובעת מי מתחיל ומי משחק בלבן.
- חוקים מיוחדים של ששבש טורקי.
- Undo ו-End Turn.
- ירושלמי בסוף משחק.
- אנימציות קוביות ואבנים.
- תגובות צ'אט באונליין.
- Pip count ולוג מהלכים.
- בדיקות אוטומטיות עבור חלק מחוקי המשחק, AI, קוביות, סאונד ומצב אונליין משותף.

## מה חסר

- Firebase Auth.
- Anonymous Auth / guest identity אמיתי.
- Login עם email/password או ספקים נוספים.
- פרופיל שחקן קבוע לפי UID.
- מסך בית / lobby מוצרי מחוץ למשחק בודד.
- XP ו-levels.
- Coins economy.
- Starting coin balance מאובטח.
- Win/loss statistics מאומתים.
- Match history.
- Daily reward / lucky wheel.
- Friends list.
- PWA / Android app / mobile wrapper.
- Firebase Security Rules מנוהלות בריפו.
- Cloud Functions עבור פעולות רגישות כמו כלכלה, rewards ותוצאות משחק.

## סדר פיצ'רים מומלץ

1. Guest / Anonymous identity.
2. Persistent player profile.
3. Match result contract.
4. Basic statistics.
5. XP and levels.
6. Coins economy.
7. Daily reward / lucky wheel.
8. Friends list.
9. Mobile / PWA / Android app.

הסדר הזה מכוון לכך שקודם תהיה זהות יציבה, אחר כך חוזה תוצאה ברור, ורק לאחר מכן מערכות progression וכלכלה שמחייבות אבטחה חזקה יותר.

## שלב 1: Guest / Anonymous identity

המטרה היא להחליף בהדרגה את הזהות המקומית הלא מאומתת בזהות Firebase Anonymous Auth.

תכנון מומלץ:

- לשמור על חוויית guest play פשוטה.
- ליצור Anonymous Firebase user באופן שקוף כאשר שחקן נכנס למשחק.
- להשתמש ב-`auth.uid` כמזהה אמין יותר מה-ID המקומי ב-localStorage.
- לשמר nickname guest קיים כדי לא לשבור את זרימת פתיחת/הצטרפות לחדר.
- לא לחייב הרשמה לפני משחק ראשון.
- לא להוסיף coins, XP או stats בשלב זה.

סיכונים:

- שינוי זהות יכול לשבור room creation/join אם לא נעשה בזהירות.
- משתמש אנונימי עדיין יכול לאבד גישה אם הוא מוחק נתוני דפדפן, לכן בהמשך צריך לאפשר שדרוג לחשבון קבוע.

## שלב 2: Persistent player profile

המטרה היא ליצור פרופיל שחקן מינימלי שמחובר ל-UID.

שדות מומלצים לפרופיל ראשון:

```text
uid
displayName
avatarPreference
isAnonymous
createdAt
updatedAt
lastSeenAt
```

כללים מומלצים:

- `uid` מגיע מ-Firebase Auth ולא מה-client.
- `displayName` חייב validation: אורך, תווים, trimming ומניעת HTML injection.
- `avatarPreference` צריך להיות ערך מתוך רשימה מותרת בלבד.
- `createdAt`, `updatedAt` ו-`lastSeenAt` צריכים להתבסס על server timestamp כאשר אפשר.
- בשלב הראשון אין בפרופיל coins, XP, level, wins או losses כנתונים שה-client יכול לערוך.

## שלב 3: Match result contract

לפני שמעדכנים statistics, XP או coins, צריך להגדיר חוזה תוצאת משחק ברור.

מבנה מוצע:

```text
matchId
roomCode
mode
players
winnerUid
loserUid
winnerColor
loserColor
startedAt
endedAt
finalStatus
resultSource
clientSubmittedBy
serverVerified
createdAt
updatedAt
```

עקרונות:

- בשלב ראשון אפשר לתעד/ליצור contract בלי לחלק rewards.
- client יכול לדווח על אירוע סיום משחק כבקשה, אבל לא להחליט בעצמו על rewards בתשלום.
- בהמשך Cloud Function צריכה לאמת או לפחות להיות הגורם היחיד שמחשב rewards וסטטיסטיקות.
- אם בעתיד coins יהיו משמעותיים, ייתכן שיהיה צורך באימות מהלכים/קוביות בצד שרת או במודל anti-cheat חזק יותר.

## שלב 4: Basic statistics

סטטיסטיקות בסיסיות מומלצות:

```text
gamesPlayed
wins
losses
winRate
lastMatchAt
currentStreak
bestStreak
```

כללים:

- client לא כותב ישירות wins/losses/statistics.
- statistics מתעדכנות רק בעקבות match result מאומת או server-authoritative function.
- בשלב מוקדם אפשר להציג stats read-only בלבד.
- משחק מול מחשב ומשחק מול שחקן אמיתי צריכים להיות מסומנים בנפרד.
- עד שלא קיימת כתיבה מאובטחת בצד שרת, כל UI stats חייב להיות placeholder או תצוגת preview לא שמורה.
- אין להוסיף כתיבות client-only לשדות סטטיסטיקה (wins/losses/winRate/streaks) כמקור אמת.

## שלב 5: XP and levels

XP ו-levels צריכים להגיע אחרי שיש match result contract ו-statistics בסיסיות.

תכנון מומלץ:

- XP ניתן על משחקים שהסתיימו באופן חוקי.
- ניצחון מול שחקן אמיתי יכול לתת יותר XP מניצחון מול מחשב.
- הפסד יכול לתת מעט XP כדי לעודד המשך משחק.
- level מחושב מתוך XP או נשמר כ-cache שמחושב בצד שרת.
- client לא כותב XP או level ישירות.

## שלב 6: Coins economy

Coins הם נכס רגיש יותר מ-XP ולכן צריכים להגיע רק אחרי Auth, profile, match result contract ושרת.

תכנון מומלץ:

- שחקן חדש יכול להתחיל עם balance ראשוני, למשל 1,500 coins.
- starting balance חייב להינתן פעם אחת בלבד בצד שרת.
- שולחנות התחלה אפשריים: 50, 100, 250 coins.
- שולחנות גבוהים יכולים להיפתח לפי level או balance.
- כל שינוי balance חייב להיכתב דרך ledger.
- client לא כותב balance ישירות.

מבנה ledger מוצע:

```text
ledgerId
uid
type
amount
balanceBefore
balanceAfter
source
matchId
createdAt
createdBy
```

אסור לדלג על ledger אם coins הופכים לחלק משמעותי מהמוצר.

## שלב 7: Daily reward / lucky wheel

Daily reward או lucky wheel צריכים להיות server-authoritative.

כללים:

- זמינות reward נקבעת לפי זמן שרת, לא לפי זמן מכשיר.
- client יכול לבקש spin, אבל לא לבחור פרס ולא לסמן לעצמו reward כזמין.
- Cloud Function מחשבת eligibility, בוחרת פרס, מעדכנת ledger ומחזירה תוצאה.
- פרסים גדולים צריכים להיות נדירים ומוגבלים.
- יש לשמור `lastDailyRewardAt` או רשומת reward history בצד שרת.

פרסים אפשריים לעתיד:

```text
50, 100, 200, 350, 500, 1000, 2500, 10000 coins
```

## שלב 8: Friends list

Friends list צריך להגיע אחרי שיש Auth ו-profile יציבים.

תכנון מומלץ:

- בקשת חברות דו-שלבית: pending / accepted / blocked.
- client יכול ליצור בקשה רק בשם עצמו.
- אי אפשר להוסיף חברים בשם משתמש אחר.
- בהמשך אפשר להוסיף invite למשחק מתוך friends list.

## שלב 9: Mobile / PWA / Android app

Mobile צריך להגיע אחרי שהמוצר הבסיסי יציב.

סדר מומלץ:

1. PWA בסיסי: manifest, icons, installability ו-loading states.
2. שיפור mobile browser: touch targets, safe areas, orientation, keyboard.
3. Android app עם Capacitor או wrapper דומה.
4. iOS רק אחרי Android ו-Web יציבים.

חשוב: לא להתחיל mobile app על בסיס מוצר שלא סיים Auth/Profile/progression בסיסיים.

## Security risks מרכזיים

הסיכונים המרכזיים הם:

- client שמוסיף לעצמו coins.
- client שמעדכן לעצמו XP או level.
- client שמעדכן wins/losses/statistics ישירות.
- client שמסמן daily reward כזמין מחדש.
- client שמחליט שהוא ניצח במשחק בתשלום.
- client שמשנה room/game state כדי להשפיע על rewards.
- שימוש בזמן מכשיר במקום זמן שרת.
- שימוש ב-localStorage כמקור אמת לזהות או progression.

Firebase config ציבורי בצד לקוח אינו בעיה בפני עצמו. האבטחה חייבת להגיע מ-Firebase Security Rules, ולפעולות רגישות גם מ-Cloud Functions.

## Client-write vs Server-write ownership

### מותר ל-client לכתוב, בכפוף ל-Rules ו-validation

- `displayName` של המשתמש עצמו.
- `avatarPreference` של המשתמש עצמו מתוך רשימה מותרת.
- העדפות UI לא רגישות.
- ready state של השחקן עצמו בחדר.
- reaction/chat קצר של השחקן עצמו, עם הגבלות אורך ותוכן.
- בקשת spin/reward או בקשת סיום משחק, כל עוד זו בקשה בלבד ולא עדכון reward בפועל.

### אסור ל-client לכתוב ישירות

- coins balance.
- XP.
- level.
- wins.
- losses.
- win rate.
- current streak / best streak.
- daily reward eligibility.
- daily reward result.
- paid match payout.
- starting coin grant.
- economy ledger entries.
- server-verified match result.

### חייב להיות server-write / Cloud Functions

- יצירת balance ראשוני.
- כל שינוי coins.
- כל שינוי XP.
- חישוב level אם נשמר במסד הנתונים.
- עדכון wins/losses/statistics.
- daily reward spin ותוצאת הפרס.
- paid match settlement.
- יצירת ledger entries.
- אימות או אישור match result שמשפיע על progression או כלכלה.

## מה דורש Firebase Security Rules

Security Rules צריכות להגן לפחות על:

- קריאה/כתיבה לפרופיל לפי `auth.uid`.
- מניעת כתיבה לשדות רגישים בפרופיל.
- מניעת כתיבה ישירה ל-wallets, balances ו-ledger.
- מניעת כתיבה ישירה ל-XP, levels ו-statistics.
- מניעת claim ישיר של daily rewards.
- הגבלת כתיבה לחדרים רק לשחקנים שמשתתפים בחדר.
- הגבלת player slot כך ששחקן לא יכתוב בשם היריב.
- validation בסיסי לאורך מחרוזות כמו displayName ו-reactions.

## מה דורש Cloud Functions

Cloud Functions נדרשות עבור:

- יצירת פרופיל ראשוני עם server timestamp.
- הענקת starting coin balance פעם אחת בלבד.
- settlement של משחקים בתשלום.
- עדכון statistics בעקבות match result.
- הענקת XP וחישוב level.
- daily reward / lucky wheel לפי server time.
- כתיבת economy ledger.
- פעולות anti-cheat עתידיות אם coins מקבלים ערך משמעותי.

## מה לא ליישם client-only

לא ליישם client-only עבור:

- coins אמיתיים.
- XP אמיתי.
- levels אמיתיים אם הם משפיעים על פתיחת שולחנות או rewards.
- win/loss statistics.
- daily wheel אמיתי.
- paid match rewards.
- starting balance שניתן לקבל שוב ושוב.
- reward cooldown.
- economy ledger.

אם בכל זאת נדרש prototype מהיר, חובה לסמן אותו בבירור כלא מאובטח, לא production-ready, ולא לחבר אותו ל-rewards אמיתיים.

## ה-PR הקטן הבא אחרי מסמך זה

ה-PR הקוד הבא צריך להיות קטן וממוקד:

1. להוסיף Firebase Anonymous Auth foundation.
2. לשמור על guest nickname קיים.
3. לא לשנות gameplay logic.
4. לא להוסיף coins, XP, stats או rewards.
5. להוסיף בדיקות ל-helper-ים טהורים של profile/displayName אם נוצרים.
6. לבדוק שחדרי אונליין עדיין נפתחים ומצטרפים כרגיל.

## דברים שלא נוגעים בהם כרגע

- `index.html`, אלא אם יש PR קוד ייעודי ומוגבל.
- `src/game/*`.
- `src/ui/render.js`.
- Firebase online room logic.
- dice randomness.
- AI.
- move legality.
- Undo / End Turn.
- board visuals.
- 3D board work.
