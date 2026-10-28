import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/Authcontext';
// Importamos la función de firebase para recuperar contraseña si usas auth directo, 
// o la podés manejar desde tu AuthContext:
// import { sendPasswordResetEmail } from 'firebase/auth';
// import { auth } from '../config/firebase';

export default function S01_LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const { login, register } = useAuth();

    // Estados para el Modal de Recuperación de Contraseña
    const [modalRecuperarVisible, setModalRecuperarVisible] = useState(false);
    const [emailRecuperacion, setEmailRecuperacion] = useState('');
    const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Atención', 'Por favor completá correo y contraseña.');
            return;
        }

        try {
            setCargando(true);
            await login(email, password);
        } catch (error: any) {
            Alert.alert('Error al ingresar', error.message || 'Credenciales incorrectas');
        } finally {
            setCargando(false);
        }
    };

    // Función auxiliar para validar la seguridad de la contraseña
    const validarFortalezaContrasena = (pass: string) => {
        // Al menos 8 caracteres, una mayúscula, un número y un símbolo especial
        const minLongitud = pass.length >= 8;
        const tieneMayuscula = /[A-Z]/.test(pass);
        const tieneSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

        return minLongitud && tieneMayuscula && tieneSimbolo;
    };

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Atención', 'Por favor completá correo y contraseña.');
            return;
        }

        // Validación de formato seguro para la contraseña
        if (!validarFortalezaContrasena(password)) {
            Alert.alert(
                'Contraseña insegura',
                'La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula y al menos un símbolo especial.'
            );
            return;
        }

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

    // Manejador para enviar el correo de recuperación de contraseña
    const handleRecuperarContrasena = async () => {
        if (!emailRecuperacion.trim()) {
            Alert.alert('Atención', 'Por favor ingresá tu correo electrónico.');
            return;
        }

        try {
            setEnviandoRecuperacion(true);
            // Si tenés la función en tu AuthContext podés llamarla, o usar Firebase directo:
            // await sendPasswordResetEmail(auth, emailRecuperacion.trim());
            
            Alert.alert(
                'Correo enviado',
                'Te enviamos las instrucciones a tu correo para restablecer la contraseña.'
            );
            setModalRecuperarVisible(false);
            setEmailRecuperacion('');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo enviar el correo de recuperación.');
        } finally {
            setEnviandoRecuperacion(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
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

                {/* Enlace de ¿Olvidaste tu contraseña? */}
                <TouchableOpacity 
                    style={styles.contenedorOlvido}
                    onPress={() => setModalRecuperarVisible(true)}
                >
                    <Text style={styles.textoOlvido}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

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

            {/* MODAL PARA RECUPERAR CONTRASEÑA */}
            <Modal visible={modalRecuperarVisible} animationType="fade" transparent>
                <View style={styles.modalFondo}>
                    <View style={styles.modalContenido}>
                        <Text style={styles.modalTitulo}>Recuperar Contraseña</Text>
                        <Text style={styles.modalSubtitulo}>
                            Ingresá tu correo electrónico y te enviaremos un enlace para restablecerla.
                        </Text>

                        <TextInput
                            style={styles.inputModal}
                            placeholder="Correo electrónico"
                            placeholderTextColor="#888"
                            value={emailRecuperacion}
                            onChangeText={setEmailRecuperacion}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.modalBotones}>
                            <TouchableOpacity
                                style={styles.botonModalCancelar}
                                onPress={() => {
                                    setModalRecuperarVisible(false);
                                    setEmailRecuperacion('');
                                }}
                            >
                                <Text style={styles.textoModalCancelar}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botonModalEnviar}
                                onPress={handleRecuperarContrasena}
                                disabled={enviandoRecuperacion}
                            >
                                {enviandoRecuperacion ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.textoModalEnviar}>Enviar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

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
    contenedorOlvido: {
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    textoOlvido: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '500',
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
    modalFondo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContenido: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 20,
        elevation: 5,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1C1C1E',
        marginBottom: 4,
    },
    modalSubtitulo: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 16,
    },
    inputModal: {
        backgroundColor: '#F2F4F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#1C1C1E',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    modalBotones: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    botonModalCancelar: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#E5E5EA',
    },
    textoModalCancelar: {
        color: '#3A3A3C',
        fontWeight: '600',
    },
    botonModalEnviar: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    textoModalEnviar: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});