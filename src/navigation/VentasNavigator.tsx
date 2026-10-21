import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { S09_VentasScreen } from '../screens/S09_VentasScreen';
import { VentasStackParamList } from '../types/navigation';

// Inicializamos el Stack Navigator de Ventas tipado
const Stack = createNativeStackNavigator<VentasStackParamList>();

export default function VentasNavigator(): React.ReactNode {
    return (
    <Stack.Navigator
        screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        headerTintColor: '#1A1A1A',
        headerTitleAlign: 'center',
        }}
    >
        <Stack.Screen
        name="VentasMain"
        component={S09_VentasScreen}
        options={{
            title: 'Caja y Mostrador',
        }}
        />
    </Stack.Navigator>
    );
}