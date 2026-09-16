import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/Authcontext';
import S01_LoginScreen from '../screens/S01_LoginScreen';
import AppNavigator from './AppNavigator';

const Stack = createNativeStackNavigator(); //inicializamos el stack navigator para la navegación principal de la app, que contendrá las pantallas de autenticación y la navegación principal de la app.


//Comprobar si hay un usuario logueado y decidir que conjunto de pantallas mostrar. Si hay un usuario logueado, se muestra la navegación principal de la app (AppNavigator). Si no hay un usuario logueado, se muestra la pantalla de login (S01_LoginScreen).


export default function RootNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? ( 
          <Stack.Screen name="App" component={AppNavigator} /> ////Si existe entra a la App con Appnavigator
        ) : (
          <Stack.Screen name="Auth" component={S01_LoginScreen} /> //Si no existe entra a la pantalla de login S01_LoginScreen
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}