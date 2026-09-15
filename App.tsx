import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'; //Importar componentes de React Native para la interfaz de usuario
import { AuthProvider, useAuth } from './src/context/Authcontext'; //usamos el envoltorio AuthProvider que creamos.
import S01_LoginScreen from './src/screens/S01_LoginScreen';
import RootNavigator from './src/navigation/RootNavigator';

function RutasApp() {

    //decide segun el estado de la variable loading si muestra la pantalla de carga o la pantalla de login.
    const { user, loading, logout } = useAuth();

        //Si loading es true, muestra un indicador de carga mientras se verifica el estado de autenticación del usuario.
        if (loading) {
            return (
                <View style={styles.centrado}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            );
        }

        //Si loading es false y no hay usuario conectado, muestra la pantalla de login.
        if (!user) {
            return <S01_LoginScreen />;
        }
        
        //Si loading es false y hay usuario conectado, muestra la pantalla de bienvenida con la opción de cerrar sesión.
        return (
            <View style={styles.centrado}>
            <Text style={styles.texto}>¡Sesión iniciada con éxito!</Text>
            <Text style={styles.subtexto}>Conectado como: {user.email}</Text>
            
            <View style={{ marginTop: 20 }}>
                <Text style={styles.botonSalir} onPress={logout}>
                Cerrar Sesión
                </Text>
            </View>
            </View>
        );
}

    //Funcion que se realiza al iniciar la app, que envuelve toda la app con el contexto de autenticación para que cualquier componente pueda acceder a los datos de autenticación.

    export default function App() {
        return (
            <AuthProvider>
                <RutasApp />
                <RootNavigator />
            </AuthProvider>
    );
    }


    const styles = StyleSheet.create({
    centrado: {
        flex: 1,                    // Ocupa todo el alto y ancho disponible de la pantalla
        backgroundColor: '#FFFFFF', // Fondo blanco
        justifyContent: 'center',  // Centra todo verticalmente
        alignItems: 'center',      // Centra todo horizontalmente
        padding: 20,               // Margen interno para no pegar el texto a los bordes
    },
    texto: {
        fontSize: 20,               // Tamaño del título
        fontWeight: 'bold',         // Letra en negrita
        color: '#1A1A1A',          // Color gris casi negro
        marginBottom: 8,           // Separación hacia el texto de abajo
    },
    subtexto: {
        fontSize: 15,               // Tamaño del mail
        color: '#555555',         
    },
    botonSalir: {
        color: '#FF3B30',         // Rojo de alerta para indicar cerrar sesión
        fontSize: 16,
        fontWeight: '600',
        padding: 10,               // Espacio táctil cómodo para presionar con el dedo
    },
    });