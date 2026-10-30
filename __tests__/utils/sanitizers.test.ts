import { sanearEntero, sanearImporte } from '../../src/utils/sanitizers';

describe('Funciones de Saneamiento y Validación de Datos - sanitizers', () => {
  describe('sanearImporte', () => {
    it('debe retornar 0 para valores vacíos, nulos o indefinidos', () => {
      expect(sanearImporte('')).toBe(0);
      expect(sanearImporte(null)).toBe(0);
      expect(sanearImporte(undefined)).toBe(0);
    });

    it('debe convertir comas a puntos decimales correctamente', () => {
      expect(sanearImporte('150,50')).toBe(150.5);
      expect(sanearImporte('999,99')).toBe(999.99);
      expect(sanearImporte('0,25')).toBe(0.25);
    });

    it('debe procesar números flotantes ya formateados con punto', () => {
      expect(sanearImporte('250.75')).toBe(250.75);
      expect(sanearImporte(1200.5)).toBe(1200.5);
    });

    it('debe ignorar espacios en blanco accidentales', () => {
      expect(sanearImporte('  450,20  ')).toBe(450.2);
    });

    it('debe retornar 0 ante números negativos o texto no numérico', () => {
      expect(sanearImporte('-100')).toBe(0);
      expect(sanearImporte('-50,5')).toBe(0);
      expect(sanearImporte('texto_invalido')).toBe(0);
      expect(sanearImporte('$1200')).toBe(0);
    });
  });

  describe('sanearEntero', () => {
    it('debe retornar 0 para valores vacíos, nulos o indefinidos', () => {
      expect(sanearEntero('')).toBe(0);
      expect(sanearEntero(null)).toBe(0);
      expect(sanearEntero(undefined)).toBe(0);
    });

    it('debe convertir correctamente cadenas con enteros positivos', () => {
      expect(sanearEntero('15')).toBe(15);
      expect(sanearEntero('100')).toBe(100);
      expect(sanearEntero(42)).toBe(42);
    });

    it('debe truncar números con decimales a su valor entero (unidades de inventario)', () => {
      expect(sanearEntero('15.8')).toBe(15);
      expect(sanearEntero('99,9')).toBe(99);
    });

    it('debe retornar 0 ante enteros negativos o texto alfanumérico', () => {
      expect(sanearEntero('-10')).toBe(0);
      expect(sanearEntero('sin_stock')).toBe(0);
    });
  });
});
