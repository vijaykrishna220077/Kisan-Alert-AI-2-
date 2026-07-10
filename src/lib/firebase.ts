import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from "firebase/firestore";

// Read Firebase Config from VITE_ environment variables or check if injected
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || ""
};

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let auth: any;
let db: any;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("[Firebase] Real Firebase initialized successfully.");
  } catch (error) {
    console.warn("[Firebase] Initialization failed. Falling back to High-Fidelity local simulation mode.", error);
    auth = null;
    db = null;
  }
} else {
  console.log("[Firebase] Configuration missing. Activated High-Fidelity local simulation mode.");
}

// Simulated Auth State
class MockAuth {
  private listeners: ((user: any) => void)[] = [];
  private currentUser: any = null;

  constructor() {
    // Automatically login Ramesh Reddy on boot as simulated Google Auth state
    const savedUser = localStorage.getItem("simulated_user");
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    } else {
      this.currentUser = {
        uid: "USR-701",
        email: "ramesh.guntur@gmail.com",
        displayName: "Ramesh Reddy",
        photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
        phoneNumber: "9876543210",
        providerId: "google.com",
        role: "Farmer"
      };
      localStorage.setItem("simulated_user", JSON.stringify(this.currentUser));
    }
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this.listeners.push(callback);
    // Fire initial trigger
    setTimeout(() => callback(this.currentUser), 50);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  async signInWithPopup() {
    const mockUser = {
      uid: "USR-" + Math.floor(100 + Math.random() * 900),
      email: "madeshkavitha703@gmail.com",
      displayName: "Madesh Kavitha",
      photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      phoneNumber: "9123456789",
      providerId: "google.com"
    };
    this.currentUser = mockUser;
    localStorage.setItem("simulated_user", JSON.stringify(mockUser));
    this.listeners.forEach(l => l(mockUser));
    return { user: mockUser };
  }

  async signOut() {
    this.currentUser = null;
    localStorage.removeItem("simulated_user");
    this.listeners.forEach(l => l(null));
  }
}

const mockAuthInstance = new MockAuth();

// Expose standard API wrappers
export const signInWithGoogle = async () => {
  if (auth) {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (err) {
      console.error("Firebase Google Sign In Error, falling back:", err);
      const res = await mockAuthInstance.signInWithPopup();
      return res.user;
    }
  } else {
    const res = await mockAuthInstance.signInWithPopup();
    return res.user;
  }
};

export const logoutUser = async () => {
  if (auth) {
    await signOut(auth);
  } else {
    await mockAuthInstance.signOut();
  }
};

export const subscribeToAuth = (callback: (user: any) => void) => {
  if (auth) {
    return onAuthStateChanged(auth, callback);
  } else {
    return mockAuthInstance.onAuthStateChanged(callback);
  }
};

// Firestore helper functions
export const saveUserRecord = async (userId: string, data: any) => {
  if (db) {
    try {
      await setDoc(doc(db, "users", userId), data, { merge: true });
    } catch (err) {
      console.warn("Firestore save user failed, storing locally:", err);
      localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
    }
  } else {
    localStorage.setItem(`user_profile_${userId}`, JSON.stringify(data));
  }
};

export const getUserRecord = async (userId: string) => {
  if (db) {
    try {
      const d = await getDoc(doc(db, "users", userId));
      return d.exists() ? d.data() : null;
    } catch (err) {
      console.warn("Firestore read user failed, getting local copy:", err);
      const local = localStorage.getItem(`user_profile_${userId}`);
      return local ? JSON.parse(local) : null;
    }
  } else {
    const local = localStorage.getItem(`user_profile_${userId}`);
    return local ? JSON.parse(local) : null;
  }
};

export const addExpenseToDb = async (userId: string, expense: any) => {
  if (db) {
    try {
      const ref = collection(db, "users", userId, "expenses");
      const d = await addDoc(ref, expense);
      return d.id;
    } catch (err) {
      console.warn("Firestore add expense failed, falling back locally:", err);
      const localExp = JSON.parse(localStorage.getItem(`expenses_${userId}`) || "[]");
      localExp.push(expense);
      localStorage.setItem(`expenses_${userId}`, JSON.stringify(localExp));
      return `local-${Date.now()}`;
    }
  } else {
    const localExp = JSON.parse(localStorage.getItem(`expenses_${userId}`) || "[]");
    localExp.push(expense);
    localStorage.setItem(`expenses_${userId}`, JSON.stringify(localExp));
    return `local-${Date.now()}`;
  }
};

export const getExpensesFromDb = async (userId: string) => {
  if (db) {
    try {
      const q = query(collection(db, "users", userId, "expenses"), orderBy("date", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.warn("Firestore get expenses failed, fallback:", err);
      return JSON.parse(localStorage.getItem(`expenses_${userId}`) || "[]");
    }
  } else {
    return JSON.parse(localStorage.getItem(`expenses_${userId}`) || "[]");
  }
};

// Chat logs persistence
export const addMessageToDb = async (userId: string, message: any) => {
  if (db) {
    try {
      const ref = collection(db, "users", userId, "messages");
      await addDoc(ref, message);
    } catch (err) {
      const localMsgs = JSON.parse(localStorage.getItem(`messages_${userId}`) || "[]");
      localMsgs.push(message);
      localStorage.setItem(`messages_${userId}`, JSON.stringify(localMsgs));
    }
  } else {
    const localMsgs = JSON.parse(localStorage.getItem(`messages_${userId}`) || "[]");
    localMsgs.push(message);
    localStorage.setItem(`messages_${userId}`, JSON.stringify(localMsgs));
  }
};

export const getMessagesFromDb = async (userId: string) => {
  if (db) {
    try {
      const q = query(collection(db, "users", userId, "messages"), orderBy("timestamp", "asc"));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data());
    } catch (err) {
      return JSON.parse(localStorage.getItem(`messages_${userId}`) || "[]");
    }
  } else {
    return JSON.parse(localStorage.getItem(`messages_${userId}`) || "[]");
  }
};
