import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider, isFirebaseConfigured } from './client';

export function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah.';
    case 'auth/invalid-email':
      return 'Alamat email tidak valid.';
    case 'auth/email-already-in-use':
      return 'Alamat email sudah digunakan.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
    case 'auth/network-request-failed':
      return 'Koneksi bermasalah. Periksa internet kamu lalu coba lagi.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.';
    case 'auth/requires-recent-login':
      return 'Demi keamanan, silakan masuk ulang lalu coba lagi.';
    case 'auth/popup-closed-by-user':
      return 'Proses masuk dibatalkan.';
    case 'auth/popup-blocked':
      return 'Popup diblokir browser. Izinkan popup lalu coba lagi.';
    default:
      return 'Terjadi kesalahan autentikasi. Silakan coba lagi.';
  }
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();
  if (!auth || !provider) throw new Error('Firebase belum dikonfigurasi.');
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase belum dikonfigurasi.');
  const res = await signInWithEmailAndPassword(auth, email.trim(), password);
  return res.user;
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase belum dikonfigurasi.');
  const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (name.trim()) {
    await updateProfile(res.user, { displayName: name.trim() });
  }
  await sendEmailVerification(res.user).catch(() => {});
  return res.user;
}

export async function logoutAccount(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await signOut(auth);
}

export async function sendResetEmail(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase belum dikonfigurasi.');
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerification(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('Tidak ada sesi masuk.');
  await sendEmailVerification(auth.currentUser);
}

export async function refreshCurrentUser(): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function updateDisplayName(name: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('Tidak ada sesi masuk.');
  await updateProfile(auth.currentUser, { displayName: name.trim() });
}

export async function requestEmailChange(newEmail: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('Tidak ada sesi masuk.');
  await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
}

export async function changeAccountPassword(newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error('Tidak ada sesi masuk.');
  await updatePassword(auth.currentUser, newPassword);
}

export async function reauthenticateUser(password?: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) throw new Error('Tidak ada sesi masuk.');
  const hasPassword = user.providerData.some((p) => p.providerId === 'password');
  if (hasPassword) {
    if (!password || !user.email) throw new Error('Kata sandi saat ini wajib diisi.');
    const cred = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, cred);
    return;
  }
  const provider = getGoogleProvider();
  if (!provider) throw new Error('Firebase belum dikonfigurasi.');
  await reauthenticateWithPopup(user, provider);
}

export async function deleteCurrentFirebaseUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return;
  await deleteUser(auth.currentUser);
}

export { isFirebaseConfigured };
