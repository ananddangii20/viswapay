import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCBqADCxCdGMCBT35DbGjlV_J1IydoHWik",
  authDomain: "viswapayauth.firebaseapp.com",
  projectId: "viswapayauth",
  storageBucket: "viswapayauth.firebasestorage.app",
  messagingSenderId: "713221185070",
  appId: "1:713221185070:web:f11e1ae0d635426b5509bf",
  measurementId: "G-L8X8H44Z78"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();