import { firebaseConfig } from './config.js';

const V = '12.19.0';
export const enabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
export let app = null, auth = null, db = null;
export let fa = null; // firebase-auth module namespace
export let fs = null; // firebase-firestore module namespace

export async function initFirebase() {
  if (!enabled) return false;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`),
  ]);
  fa = authMod; fs = fsMod;
  app = appMod.initializeApp(firebaseConfig);
  auth = fa.getAuth(app);
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  } catch (e) {
    console.warn('persistent cache unavailable, using memory cache', e);
    db = fs.getFirestore(app);
  }
  return true;
}
