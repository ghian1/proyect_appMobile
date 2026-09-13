//Saber si hay alguien conectado, todavia en linea

import React, { createContext, useContext, useEffect, useState } from 'react';
//createContext:crea el canal de datos global
//useContext: Permite a las pantallas conectarse al canal de datos global y acceder a los datos que se encuentran en el contexto.
//useState: variables que al cambiar su valor obligan a la pantalla a redibujarse
//useEffect: funcion que se ejecuta cuando la pantalla se monta, y cuando se desmonta


//Importar funciones de Firebase para autenticación
import {
    User,
    createUserWithEmailAndPassword,
    onAuthStateChanged, //Detecta si hay un usuario conectado 
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth } from '../config/firebase';

//Definir el tipo de datos que tendrá el contexto de autenticación(como si fuera un contrato)
interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

//conectar el contexto de autenticación con React
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null); //user arranca en null porque al inicio no sabemos si hay un usuario conectado.
    const [loading, setLoading] = useState(true); //loading arranca en true porque al inicio no sabemos si hay un usuario conectado.

    useEffect(() => {
    // Escucha en tiempo real si el usuario está conectado o cierra sesión
        
        //corre cuando arranca la app, y cuando el usuario se conecta o desconecta. Pregunta a Firebase si hay un usuario conectado, y si lo hay, lo guarda en el estado user. Si no hay usuario conectado, guarda null en el estado user. Cuando termina de ejecutar la función, cambia el estado loading a false.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        return unsubscribe;
    },  []);

    const login = async (email: string, pass: string) => {
    // .trim() elimina espacios en blanco que el teclado del celular a veces mete al final del correo
    await signInWithEmailAndPassword(auth, email.trim(), pass);
    };

    //Función asincrónica para registrar una nueva cuenta
    const register = async (email: string, pass: string) => {
        await createUserWithEmailAndPassword(auth, email.trim(), pass);
    };

    // Función asincrónica para cerrar la sesión activa
    const logout = async () => {
    await signOut(auth);
    };

    //retorna el contexto de autenticación con los datos del usuario, el estado de carga y las funciones de login, register y logout. Esto permite que cualquier componente que consuma este contexto pueda acceder a estos datos y funciones.
    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );

    
};

//Hook personalizado para usar el contexto de autenticación en cualquier componente funcional
//export hace publica la función para que pueda ser usada en otros archivos
//Lo usamos en las pantallas que queresmos saber: quién es el usuario o ejecutar una acción de la cuenta
export const useAuth = () => useContext(AuthContext);