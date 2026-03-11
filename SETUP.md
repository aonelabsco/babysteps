# baby steps — setup guide

## 1. set up firebase (free)

1. go to [firebase console](https://console.firebase.google.com/)
2. click "add project", name it anything (e.g., "babysteps")
3. disable google analytics (not needed), click create

### enable google sign-in
4. in firebase console, go to **authentication** > **sign-in method**
5. click **google**, enable it, add your email as support email, save

### create database
6. go to **firestore database** > **create database**
7. choose **start in test mode** (we'll add rules later)
8. pick a region close to you, click enable

### get your config
9. go to **project settings** (gear icon) > **general**
10. scroll down, click **add app** > **web** (</> icon)
11. name it "baby steps", click register
12. copy the config values — you need: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId

### set firestore rules
13. go to **firestore database** > **rules**, replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // users can read/write their own family mapping
    match /userFamilies/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // family members can read/write family data
    match /families/{familyId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }

    // events — family members can read/write
    match /events/{eventId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 2. set up your project

create a `.env.local` file in the project root:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### optional: smart voice parsing (claude ai)
if you want the app to understand any natural language input (not just simple patterns), add:
```
ANTHROPIC_API_KEY=sk-ant-...
```
get this from [console.anthropic.com](https://console.anthropic.com/). without this, the app still works great for common phrases like "fed 120 ml", "pooped big", "diaper changed".

## 3. run locally

```bash
npm install
npm run dev
```

open http://localhost:3000

## 4. deploy to vercel (free)

1. push your code to github
2. go to [vercel.com](https://vercel.com), sign in with github
3. click "new project", import your repo
4. add all the environment variables from your `.env.local` file
5. click deploy

your app will be live at `https://your-project.vercel.app`

### add to phone home screen
- **iphone**: open the url in safari > tap share > "add to home screen"
- **android**: open in chrome > tap menu > "add to home screen" or "install app"

## 5. how to use

1. sign in with google
2. create a family (you'll get a 6-digit code)
3. share the code with your partner — they sign in and join with the code
4. go to settings, add your baby's name
5. tap the microphone and say things like:
   - "fed 120 ml"
   - "gave her 4 ounces"
   - "pooped big"
   - "diaper change"
   - "sarah fed 90 ml" (if multiple babies)
6. or use the quick buttons, or type in the text box
7. both parents see the same data in real time

## 6. create firestore indexes

when you first use the app, firebase may show an error about missing indexes. click the link in the browser console error message — it will take you directly to firebase to create the needed index with one click.
