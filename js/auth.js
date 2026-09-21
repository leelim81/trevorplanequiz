import * as fb from './firebase.js';

export function watchAuth(cb) { return fb.fa.onAuthStateChanged(fb.auth, cb); }

export async function signInWithGoogle() {
  const provider = new fb.fa.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return fb.fa.signInWithPopup(fb.auth, provider);
}

export function signOutUser() { return fb.fa.signOut(fb.auth); }
