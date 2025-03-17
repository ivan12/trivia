import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDW5S-ji35j9bQUizwVlA49QGuIR_eTJ58",
  authDomain: "trivia-e5fe1.firebaseapp.com",
  databaseURL: "https://trivia-e5fe1-default-rtdb.firebaseio.com",
  projectId: "trivia-e5fe1",
  storageBucket: "trivia-e5fe1.firebasestorage.app",
  messagingSenderId: "461452457572",
  appId: "1:461452457572:web:7c94129bd5ac66bf38d171",
  measurementId: "G-5LXR3S626H",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { app, database }

