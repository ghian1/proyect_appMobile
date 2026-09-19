import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FiadosParamList } from '../types/navigation';
import S08_FiadosScreen from '../screens/S08_FiadosScreen';

const Stack = createNativeStackNavigator<FiadosParamList>();

export default function FiadosNavigator(): React.ReactNode {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="S08_FiadosList"
        component={S08_FiadosScreen}
        options={{
          title: 'Registro de Fiados',
          headerBackTitle: '', // En native-stack se usa headerBackTitle
        }}
      />
    </Stack.Navigator>
  );
}