import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBackButton } from '../components/HeaderBackButton';
import S08_FiadosScreen from '../screens/S08_FiadosScreen';
import { FiadosParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<FiadosParamList>();

export default function FiadosNavigator(): React.ReactNode {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        headerTintColor: '#1A1A1A',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="S08_FiadosList"
        component={S08_FiadosScreen}
        options={{
          title: 'Registro de Fiados',
          //Botón de retroceso hacia la pantalla de Inicio
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack.Navigator>
  );
}
