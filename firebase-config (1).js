// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7Qozb-m-XTHx3tXWVGI5ObgLN6TwmSKc",
  authDomain: "shrmte.firebaseapp.com",
  projectId: "shrmte",
  storageBucket: "shrmte.appspot.com",
  messagingSenderId: "660245185229",
  appId: "1:660245185229:web:d9fa02e30892bad9fd5f84"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export the Firebase services
export { app, auth, db };
