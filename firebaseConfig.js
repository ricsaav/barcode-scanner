// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCFtTnEQ6N-vmhKpNwdrNovdPz9I1apfXQ",
  authDomain: "music-80a0b.firebaseapp.com",
  databaseURL: "https://music-80a0b-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "music-80a0b",
  storageBucket: "music-80a0b.appspot.com",
  messagingSenderId: "722900004547",
  appId: "1:722900004547:web:68e619f53fdedaaa10fc76",
  measurementId: "G-6E4S4Q7FN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;