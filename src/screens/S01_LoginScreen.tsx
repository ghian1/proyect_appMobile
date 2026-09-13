

import { useState } from 'react';
import {
    ActivityIndicator, //Componente para definir estilos en la pantalla
    Alert, //Componente para mostrar un indicador de carga en la pantalla
    KeyboardAvoidingView, //Componente que permite evitar que el teclado tape los campos de texto en la pantalla
    Platform //Componente que permite detectar el sistema operativo del dispositivo (iOS o Android)
    , //Componente que permite crear botones táctiles en la pantalla
    StyleSheet, //Componente contenedor que permite organizar otros componentes en la pantalla
    Text, //Componente para mostrar texto en la pantalla
    TextInput, //Componente para ingresar texto en la pantalla
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../context/Authcontext';


export default function S01_LoginScreen() {

    const [email, setEmail] = useState(''); //guarda email. arranca con cadena vacia('')
    const [password, setPassword] = useState(''); //guarda password. arranca con cadena vacia('')
    const [cargando, setCargando] = useState(false); //guarda estado de carga. arranca en false porque al inicio no hay carga.
    const { login, register } = useAuth(); //importa las funciones de login y register del contexto de autenticación


    //si email o password estan vacios, muestra alerta.
    const handleLogin = async () => {
    if (!email || !password) {
        Alert.alert('Atención', 'Por favor completá correo y contraseña.');
        return;
    }

    //seteamos cargando para mostrar la ruedita y ocultar los botones.    
    try {
        setCargando(true);
        await login(email, password);
    } catch (error: any) {
        Alert.alert('Error al ingresar', error.message || 'Credenciales incorrectas');
    } finally { 
        setCargando(false); //terminamos la etapa carga, sea cual sea el resultado.
        }
    };

    //misma estructura que handleLogin, pero para registrar un nuevo usuario.
    const handleRegister = async () => {
    if (!email || !password) {
        Alert.alert('Atención', 'Por favor completá correo y contraseña.');
        return;
    }

    //si la contraseña es menor a 6 caracteres, muestra alerta.
    if (password.length < 6) {
        Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    //misma estructura que handleLogin, pero para registrar un nuevo usuario.
    try {
        setCargando(true);
        await register(email, password);
        Alert.alert('Éxito', 'Cuenta creada correctamente.');
    } catch (error: any) {
        Alert.alert('Error al registrarse', error.message);
    } finally {
        setCargando(false);
    }
    };


    //Estructura visual 
    return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} //Ajusta el teclado segun si es iOS o Android.
        style={styles.container}
    >
        <View style={styles.card}>
        <Text style={styles.titulo}>Almacén Mingo</Text>
        <Text style={styles.subtitulo}>Gestión de Stock y Ventas</Text>

        {/* Campo de Correo Electrónico */}
        <TextInput
            placeholder="Correo electrónico"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail} //actualiza el estado email con lo que el usuario escribe
            keyboardType="email-address" //incluye el arroba 
            autoCapitalize="none" //no pone mayusculas al inicio
            style={styles.input}
        />

        {/* Campo de Contraseña */}
        <TextInput
            placeholder="Contraseña"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
        />

        {/* Indicador de carga o botones de acción */}
        {cargando ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 15 }} />
        ) : (
            <>
            <TouchableOpacity style={styles.botonPrincipal} onPress={handleLogin}>
                <Text style={styles.textoBotonPrincipal}>Iniciar Sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonSecundario} onPress={handleRegister}>
                <Text style={styles.textoBotonSecundario}>Crear cuenta nueva</Text>
            </TouchableOpacity>
            </>
        )}
        </View>
    </KeyboardAvoidingView>
    );
}

// Estilos de la pantalla de login
const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: '#F2F4F7',
    justifyContent: 'center',
    paddingHorizontal: 20,
    },

    card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    },

    titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    },

    subtitulo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
    },

    input: {
    height: 48,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    },
    
    botonPrincipal: {
    backgroundColor: '#007AFF',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    },

    textoBotonPrincipal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    },
    
    botonSecundario: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    },
    
    textoBotonSecundario: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '500',
    },
});