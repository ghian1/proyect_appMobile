import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import S01_LoginScreen from '../../src/screens/S01_LoginScreen';
import * as AuthContextModule from '../../src/context/Authcontext';

// Mock del hook useAuth
jest.mock('../../src/context/Authcontext');

describe('Pantalla de Autenticación - S01_LoginScreen', () => {
  const loginMock = jest.fn();
  const registerMock = jest.fn();
  const logoutMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (AuthContextModule.useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      login: loginMock,
      register: registerMock,
      logout: logoutMock,
    });
  });

  it('debe renderizar el título de la app, campos de texto y botones de acceso', () => {
    const { getByText, getByPlaceholderText } = render(<S01_LoginScreen />);

    expect(getByText('Almacén Mingo')).toBeTruthy();
    expect(getByText('Gestión de Stock y Ventas')).toBeTruthy();
    expect(getByPlaceholderText('Correo electrónico')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
    expect(getByText('Iniciar Sesión')).toBeTruthy();
    expect(getByText('Crear cuenta nueva')).toBeTruthy();
  });

  it('debe alertar al usuario si intenta ingresar con campos vacíos', async () => {
    const { getByText } = render(<S01_LoginScreen />);

    const botonIngresar = getByText('Iniciar Sesión');
    fireEvent.press(botonIngresar);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atención',
      'Por favor completá correo y contraseña.'
    );
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('debe alertar al usuario si la contraseña para registrarse tiene menos de 6 caracteres', async () => {
    const { getByText, getByPlaceholderText } = render(<S01_LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Correo electrónico'), 'nuevo@mingo.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), '12345'); // 5 caracteres

    const botonRegistrarme = getByText('Crear cuenta nueva');
    fireEvent.press(botonRegistrarme);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Contraseña corta',
      'La contraseña debe tener al menos 6 caracteres.'
    );
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('debe llamar a login con las credenciales ingresadas al presionar Iniciar Sesión', async () => {
    loginMock.mockResolvedValueOnce(undefined);

    const { getByText, getByPlaceholderText } = render(<S01_LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Correo electrónico'), 'cajero@mingo.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'claveSegura123');

    const botonIngresar = getByText('Iniciar Sesión');
    fireEvent.press(botonIngresar);

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('cajero@mingo.com', 'claveSegura123');
    });
  });

  it('debe mostrar mensaje de error si el login falla con credenciales incorrectas', async () => {
    loginMock.mockRejectedValueOnce(new Error('auth/invalid-credential'));

    const { getByText, getByPlaceholderText } = render(<S01_LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Correo electrónico'), 'cajero@mingo.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), 'claveErronea');

    const botonIngresar = getByText('Iniciar Sesión');
    fireEvent.press(botonIngresar);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error al ingresar',
        'auth/invalid-credential'
      );
    });
  });
});
