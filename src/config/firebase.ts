import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 1. Tus credenciales de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDQ8UnUhif2i8M7bTxIKQwixC2S8H7UVBQ",
    authDomain: "almacen-mingo.firebaseapp.com",
    projectId: "almacen-mingo",
    storageBucket: "almacen-mingo.firebasestorage.app",
    messagingSenderId: "1053854853552",
    appId: "1:1053854853552:web:26aeaf7cc975523739ce75",
    measurementId: "G-HR8FKT1C3D"
};

// 2. Inicializar Firebase (evita inicializar dos veces si se recarga la app)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 3. Inicializar Auth con persistencia en el dispositivo
let auth;
try {
    auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch {
  // @ts-ignore
    auth = getAuth(app);
}

// 4. Inicializar Firestore (Base de datos)
const db = getFirestore(app);

// 5. Exportar para usarlos en las pantallas y contextos
export { app, auth, db };

