// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebase = {
    apiKey: "AIzaSyAXNmEdVd2_oMpjCLG9JKL0k8nKStIcF1Y",
    authDomain: "measurement-4c1b7.firebaseapp.com",
    projectId: "measurement-4c1b7",
    storageBucket: "measurement-4c1b7.appspot.com",
    messagingSenderId: "590659113601",
    appId: "1:590659113601:web:3ad079a02477364b09b380",
    measurementId: "G-CM17N11SQ6"
};

// Initialize Firebase
const app = initializeApp(firebase);

// Initialize Firestore (database)
export const db = getFirestore(app);