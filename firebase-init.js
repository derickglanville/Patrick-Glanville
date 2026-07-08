(function () {
  window.__firebaseInitPromise = (async () => {
    try {
      const [{ initializeApp }, { getFirestore, doc, getDoc, setDoc, onSnapshot }] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
      ]);

      window.__firebaseLibraryLoaded = true;

      const config = window.PATRICK_FIREBASE_CONFIG || {};
      const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"];
      const missingKey = requiredKeys.find(key => !config[key]);
      if (missingKey) {
        window.__firebaseInitError = `Firebase config is missing ${missingKey}`;
        return null;
      }

      const app = initializeApp(config);
      const db = getFirestore(app);
      window.__patrickFirebase = { app, db, doc, getDoc, setDoc, onSnapshot };
      return window.__patrickFirebase;
    } catch (error) {
      window.__firebaseLibraryLoadError = error?.message || "Firebase library failed to load";
      window.__firebaseInitError = error?.message || "Firebase initialization failed";
      return null;
    }
  })();
})();
