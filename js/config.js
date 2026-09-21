// Paste your Firebase web app config here (Firebase console → Project settings → Your apps → Web).
// It is safe to commit: the apiKey only identifies the project; Firestore rules protect the data.
export const firebaseConfig = {
  apiKey: "AIzaSyDKDsbDwMPvQTxP1q896Wr5qOsdQelaxHc",
  authDomain: "trevorplanequiz.firebaseapp.com",
  projectId: "trevorplanequiz",
  storageBucket: "trevorplanequiz.firebasestorage.app",
  messagingSenderId: "831520965062",
  appId: "1:831520965062:web:63691188f4d8bc5b44b2c7",
};

// Game tuning. All timings in milliseconds.
export const GAME = {
  TIMER_MS: 3000,        // time to answer a question
  BONUS_MS: 1000,        // answer inside this window for +1 bonus point
  LIVES: 3,
  POINTS_PER_COIN: 3,    // every 3 lifetime points = 1 coin
  CLAW_WIN_CHANCE: 0.5,
  FLUSH_EVERY: 5,        // save progress to Firestore every N questions
  LEADERBOARD_SIZE: 20,
  VIDEOS: ['assets/videos/reward1.mp4', 'assets/videos/reward2.mp4', 'assets/videos/reward3.mp4'],
};
