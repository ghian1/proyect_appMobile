import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { HeaderBackButton } from '../components/HeaderBackButton';
import S10_ComprasScreen from '../screens/S10_ComprasScreen';

export type ComprasParamList = {
  S10_Compras: undefined;
};

const Stack = createNativeStackNavigator<ComprasParamList>();

export default function ComprasNavigator(): React.ReactNode {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        headerTintColor: '#1A1A1A',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen
        name="S10_Compras"
        component={S10_ComprasScreen}
        options={{
          title: 'Planilla de Compras',
          // NUEVO: Botón de retroceso hacia la pantalla de Inicio
          headerLeft: () => <HeaderBackButton />,
        }}
      />
    </Stack.Navigator>
  );
}
