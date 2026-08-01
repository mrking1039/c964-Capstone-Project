// ---------------------------------------------------------------------------
//  FIREBASE CONFIG  —  paste your own values here (see README "Firebase setup")
// ---------------------------------------------------------------------------
//
//  1. Create a free Firebase project at https://console.firebase.google.com
//  2. Build → Realtime Database → Create Database (start in TEST mode, or use
//     the rules shown in the README).
//  3. Project settings (gear icon) → "Your apps" → Web app (</>) → register →
//     copy the `firebaseConfig` object and paste its contents below.
//
//  Until you fill this in, the app runs in LOCAL mode (single browser only) so
//  you can still test it. Leave apiKey as "" to stay in local mode.
// ---------------------------------------------------------------------------

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBkf-4KDNA90C5TOfC8TkhdCHu2kQuYcPQ",
  authDomain: "gifted-subs-daily.firebaseapp.com",
  databaseURL: "https://gifted-subs-daily-default-rtdb.firebaseio.com",
  projectId: "gifted-subs-daily",
  storageBucket: "gifted-subs-daily.firebasestorage.app",
  messagingSenderId: "548221618265",
  appId: "1:548221618265:web:8362a7fc06a409b08c4948"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
