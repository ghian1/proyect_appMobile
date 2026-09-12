export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  S03_Detalle: { productId: string };
  S05_AltaEditar: { productId?: string }; // opcional si se edita o crea
};

export type MainTabParamList = {
  S02_Inicio: undefined;
  S04_Reponer: undefined;
  S06_Perfil: undefined;
};