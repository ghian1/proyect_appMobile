import { createNativeStackNavigator } from '@react-navigation/native-stack';
import S01_LoginScreen from '../screens/S01_LoginScreen';

const Stack = createNativeStackNavigator();


export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={S01_LoginScreen} />
    </Stack.Navigator>
  );
}