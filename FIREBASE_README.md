# Firebase Firestore Shared Data Setup

This tracker can use Firebase Firestore as the shared data source for all users.

## 1. Create a Firebase project and web app

1. In the Firebase console, create a project or open an existing one.
2. Register a Web app for this dashboard.
3. Copy the Firebase configuration object for the Web app.

## 2. Enable Cloud Firestore

1. Open **Build -> Firestore Database**.
2. Create the database.
3. Start in the mode you prefer for your project.

This app stores one document per client in the `tracker_state` collection:

- `patrick-glanville`
- `theodore-glanville`

## 3. Paste the web config into `firebase-config.js`

Update:

```js
window.PATRICK_FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID"
};
```

## 4. Publish

Publish at least these files:

- `index.html`
- `app.js`
- `styles.css`
- `firebase-config.js`
- `firebase-init.js`

After the page refreshes, the Data Store line should say `Firebase Firestore shared storage`.
