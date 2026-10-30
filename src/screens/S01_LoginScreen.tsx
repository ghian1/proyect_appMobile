import { Ionicons } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
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
import { auth } from '../config/firebase';
import { useAuth } from '../context/Authcontext';

export default function S01_LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const { login, register } = useAuth();

    // Estados para el Modal de Recuperación de Contraseña
    const [modalRecuperarVisible, setModalRecuperarVisible] = useState(false);
    const [emailRecuperacion, setEmailRecuperacion] = useState('');
    const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

    // Validaciones individuales para el indicador en tiempo real
    const tieneMinLength = password.length >= 8;
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneSimbolo = /[!@#$%^&*(),.?":{}|<>]/.test(password);

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

    const handleRegister = async () => {
        if (!email || !password) {
            Alert.alert('Atención', 'Por favor completá correo y contraseña.');
            return;
        }

        if (!tieneMinLength || !tieneMayuscula || !tieneSimbolo) {
            Alert.alert(
                'Contraseña insegura',
                'Por favor asegurate de cumplir con todos los requisitos de seguridad indicados debajo de la contraseña.'
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

    const handleRecuperarContrasena = async () => {
        if (!emailRecuperacion.trim()) {
            Alert.alert('Atención', 'Por favor ingresá tu correo electrónico.');
            return;
        }

        try {
            setEnviandoRecuperacion(true);
            await sendPasswordResetEmail(auth, emailRecuperacion.trim());

            Alert.alert(
                'Correo enviado',
                'Te enviamos las instrucciones a tu correo para restablecer la contraseña. (Revisá también la carpeta de spam).'
            );
            setModalRecuperarVisible(false);
            setEmailRecuperacion('');
        } catch (error: any) {
            let mensaje = 'No se pudo enviar el correo de recuperación.';
            if (error.code === 'auth/user-not-found') {
                mensaje = 'No existe una cuenta registrada con este correo.';
            } else if (error.code === 'auth/invalid-email') {
                mensaje = 'El formato del correo electrónico es inválido.';
            }
            Alert.alert('Error', mensaje);
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
                <View style={styles.logoContenedor}>
                    <Ionicons name="storefront-outline" size={42} color="#0284C7" />
                </View>
                <Text style={styles.titulo}>Almacén Mingo</Text>
                <Text style={styles.subtitulo}>Gestión de Stock y Ventas</Text>

                {/* Campo de Correo Electrónico */}
                <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Correo electrónico"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Campo de Contraseña */}
                <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {/* Validador visual dinámico de contraseña (aparece mientras escribe) */}
                {password.length > 0 && (
                    <View style={styles.validadorContenedor}>
                        <View style={styles.validadorFila}>
                            <Ionicons 
                                name={tieneMinLength ? "checkmark-circle" : "ellipse-outline"} 
                                size={14} 
                                color={tieneMinLength ? "#16A34A" : "#94A3B8"} 
                            />
                            <Text style={[styles.validadorTexto, tieneMinLength && styles.textoCumplido]}>
                                Al menos 8 caracteres
                            </Text>
                        </View>
                        <View style={styles.validadorFila}>
                            <Ionicons 
                                name={tieneMayuscula ? "checkmark-circle" : "ellipse-outline"} 
                                size={14} 
                                color={tieneMayuscula ? "#16A34A" : "#94A3B8"} 
                            />
                            <Text style={[styles.validadorTexto, tieneMayuscula && styles.textoCumplido]}>
                                Una letra mayúscula
                            </Text>
                        </View>
                        <View style={styles.validadorFila}>
                            <Ionicons 
                                name={tieneSimbolo ? "checkmark-circle" : "ellipse-outline"} 
                                size={14} 
                                color={tieneSimbolo ? "#16A34A" : "#94A3B8"} 
                            />
                            <Text style={[styles.validadorTexto, tieneSimbolo && styles.textoCumplido]}>
                                Un símbolo especial (!@#$...)
                            </Text>
                        </View>
                    </View>
                )}

                {/* Enlace de ¿Olvidaste tu contraseña? */}
                <TouchableOpacity 
                    style={styles.contenedorOlvido}
                    onPress={() => setModalRecuperarVisible(true)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.textoOlvido}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>

                {/* Indicador de carga o botones de acción */}
                {cargando ? (
                    <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 15 }} />
                ) : (
                    <>
                        <TouchableOpacity 
                            style={styles.botonPrincipal} 
                            onPress={handleLogin}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.textoBotonPrincipal}>Iniciar Sesión</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.botonSecundario} 
                            onPress={handleRegister}
                            activeOpacity={0.8}
                        >
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

                        <View style={styles.inputModalWrapper}>
                            <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputModal}
                                placeholder="Correo electrónico"
                                placeholderTextColor="#94A3B8"
                                value={emailRecuperacion}
                                onChangeText={setEmailRecuperacion}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.modalBotones}>
                            <TouchableOpacity
                                style={styles.botonModalCancelar}
                                onPress={() => {
                                    setModalRecuperarVisible(false);
                                    setEmailRecuperacion('');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.textoModalCancelar}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botonModalEnviar}
                                onPress={handleRecuperarContrasena}
                                disabled={enviandoRecuperacion}
                                activeOpacity={0.8}
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
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E0F2FE',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    logoContenedor: {
        alignSelf: 'center',
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#F0F9FF',
        borderWidth: 1,
        borderColor: '#BAE6FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    titulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
        textAlign: 'center',
    },
    subtitulo: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        marginTop: 4,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#0F172A',
    },
    validadorContenedor: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    validadorFila: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    validadorTexto: {
        fontSize: 12,
        color: '#64748B',
    },
    textoCumplido: {
        color: '#16A34A',
        fontWeight: '600',
    },
    contenedorOlvido: {
        alignItems: 'flex-end',
        marginBottom: 18,
    },
    textoOlvido: {
        color: '#0284C7',
        fontSize: 13,
        fontWeight: '600',
    },
    botonPrincipal: {
        backgroundColor: '#0284C7',
        height: 48,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    textoBotonPrincipal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 'bold',
    },
    botonSecundario: {
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    textoBotonSecundario: {
        color: '#0284C7',
        fontSize: 14,
        fontWeight: '600',
    },
    modalFondo: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContenido: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E0F2FE',
        elevation: 6,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    modalSubtitulo: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 16,
        lineHeight: 18,
    },
    inputModalWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    inputModal: {
        flex: 1,
        height: 44,
        fontSize: 15,
        color: '#0F172A',
    },
    modalBotones: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    botonModalCancelar: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
    },
    textoModalCancelar: {
        color: '#334155',
        fontWeight: '600',
        fontSize: 14,
    },
    botonModalEnviar: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#0284C7',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
    },
    textoModalEnviar: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});