// public/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBeewwb030YelvWvGq3C0lj_IDTB7jRx2Q",
  authDomain: "delgrosso-viaggi.firebaseapp.com",
  projectId: "delgrosso-viaggi",
  storageBucket: "delgrosso-viaggi.appspot.com",
  messagingSenderId: "482448201437",
  appId: "1:482448201437:web:8547de3854f274dedfad34"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
