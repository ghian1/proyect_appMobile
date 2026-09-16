import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Pantallas que pertenecen exclusivamente al módulo de Stock
import { StockStackParamList } from '@/types/navigation'; //importamos el contrato que hicimos en navigation.ts para tipar los parámetros de las pantallas del módulo de stock
import { S03_ProductDetailScreen } from '../screens/S03_ProductDetailScreen';
import { S05_AltaEditarScreen } from '../screens/S05_AltaEditarScreen';
import { S07_StockListScreen } from '../screens/S07_StockListScreen';


//Inicializamos el Stack Navigator tipado con las rutas de Stock
const Stack = createNativeStackNavigator<StockStackParamList>();

// Tipado de parámetros del módulo de stock

export default function StockNavigator() {
    return (
    <Stack.Navigator
    initialRouteName="StockList" //Pantalla inicial visible al entrar al modulo de stock.
    screenOptions={{
        headerStyle: { backgroundColor: '#F2F4F7' },
        headerTintColor: '#1A1A1A',
        headerTitleAlign: 'center',
    }}
    >
    <Stack.Screen 
        name="StockList" 
        component={S07_StockListScreen} 
        options={{ title: 'Gestión de Inventario' }} 
    />
    <Stack.Screen 
        name="ProductDetail" 
        component={S03_ProductDetailScreen} //Se muestra al seleccionar un producto de la lista
        options={{ title: 'Detalle del Producto' }} 
    />
    <Stack.Screen 
        name="ProductEdit" 
        component={S05_AltaEditarScreen} //Se abre para dar de alta un producto nuevo o editar uno existente.
        options={{ title: 'Cargar / Editar Producto' }} 
    />
    </Stack.Navigator>
    );
}