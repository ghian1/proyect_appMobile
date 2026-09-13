import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// @ts-ignore
import { Auth, getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; //conector para la base de datos.

//getReactNativePersistence: guarda la sesión del usuario en el dispositivo, para que no se cierre la sesión al cerrar la app.
//initializeAuth y getAuth: Funciones para inicializar el motor de usuarios.
//Auth: Es la etiqueta que se le da a la variable auth para que TypeScript sepa que es un objeto de tipo Auth. Esto es necesario porque al usar getAuth, TypeScript no sabe qué tipo de objeto es, y al usar initializeAuth, TypeScript sabe que es un objeto de tipo Auth.
//ReactNativeAsyncStorage: La librería nativa del teléfono que funciona como el disco rígido de la app para guardar datos de texto en clave-valor.

//credenciales de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC4939rneP76EzJsXf6jGvcYnQEoiFDm08",
    authDomain: "almacen-mingo.firebaseapp.com",
    projectId: "almacen-mingo",
    storageBucket: "almacen-mingo.firebasestorage.app",
    messagingSenderId: "1053854853552",
    appId: "1:1053854853552:web:26aeaf7cc975523739ce75",
    measurementId: "G-HR8FKT1C3D"
};

//inicializar Firebase App, si no hay ninguna app inicializada, inicializa una nueva app con las credenciales de Firebase. Si ya hay una app inicializada, obtiene la app existente.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

//inicializar Firebase Auth. 
let auth: Auth; //Declaramos auth con tipo Auth.
try {
    auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
} catch {
  // @ts-ignore
    auth = getAuth(app);
}

//Inicializar Firestore (Base de datos)
const db = getFirestore(app);

//Hacemos que auth y db sean exportables para poder usarlos en otros archivos.
export { app, auth, db };

