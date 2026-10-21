import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import S10_ComprasScreen from '../screens/S10_ComprasScreen';

export type ComprasParamList = {
  S10_Compras: undefined;
};

const Stack = createNativeStackNavigator<ComprasParamList>();

export default function ComprasNavigator(): React.ReactNode {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="S10_Compras"
        component={S10_ComprasScreen}
        options={{
          title: 'Planilla de Compras',
          headerBackTitle: '',
        }}
      />
    </Stack.Navigator>
  );
}