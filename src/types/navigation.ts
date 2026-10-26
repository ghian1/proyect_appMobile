//------------------------------
//src/types/navigation.ts es el registro central de contratos de navegación de toda la app.
//------------------------------

//rootStackParamList define los parámetros que se pueden pasar a cada pantalla en la pila de navegación principal. Cada propiedad del objeto representa una pantalla y su valor es el tipo de los parámetros que se esperan para esa pantalla. Si una pantalla no espera ningún parámetro, se puede establecer como undefined.

export type RootStackParamList = {
  Auth: undefined; //para ir al login no necesitamos nada(undefined)
  MainTabs: undefined; //para ir al menu principal no necesitamos nada(undefined)
  StockFlow: undefined;   
  VentasFlow: undefined;
  FiadosFlow: undefined;
  ComprasFlow: undefined;
};

//Solapas principales del pie de pantalla simplificadas a 2 pestañas: Inicio y Métricas. Antes eran Inicio, Para reponer, Perfil. A futuro implementaremos Perfil como la tercera. 
export type MainTabParamList = {
  S02_Inicio: undefined;
  S11_Metricas: undefined;
};

// 3. Pantallas internas del módulo Stock
export type StockStackParamList = {
  StockList: undefined;
  ProductDetail: { productId: string };
  ProductEdit: { productId?: string };
};

// 4. Pantallas del modulo de fiado
export type FiadosParamList = {
  S08_FiadosList: undefined;
};

//5. Pantallas internas del módulo de Ventas
export type VentasStackParamList = {
  VentasMain: undefined; // Pantalla principal de la caja / mostrador de ventas
};

//Luego agregaremos los contratos de las demas pantallas.
