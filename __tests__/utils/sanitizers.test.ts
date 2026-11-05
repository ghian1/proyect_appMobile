import { calcularSubtotalItem, formatearStock, sanearEntero, sanearImporte } from '../../src/utils/sanitizers';

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

  describe('formatearStock', () => {
    it('debe retornar "SIN STOCK" si el stock es 0 o negativo', () => {
      expect(formatearStock(0, false)).toBe('SIN STOCK');
      expect(formatearStock(-5, true)).toBe('SIN STOCK');
    });

    it('debe formatear en unidades para productos que no son al peso', () => {
      expect(formatearStock(10, false)).toBe('Stock: 10 unidades.');
      expect(formatearStock(1, undefined)).toBe('Stock: 1 unidades.');
    });

    it('debe formatear en kg con decimales si esAlPeso y stock >= 1000g', () => {
      expect(formatearStock(4500, true)).toBe('Stock: 4.5 kg');
      expect(formatearStock(5000, true)).toBe('Stock: 5 kg');
      expect(formatearStock(1250, true)).toBe('Stock: 1.25 kg');
    });

    it('debe formatear directamente en g si esAlPeso y stock < 1000g', () => {
      expect(formatearStock(350, true)).toBe('Stock: 350 g');
      expect(formatearStock(50, true)).toBe('Stock: 50 g');
      expect(formatearStock(999, true)).toBe('Stock: 999 g');
    });
  });

  describe('calcularSubtotalItem', () => {
    it('debe calcular subtotal por unidades para productos estándar', () => {
      expect(calcularSubtotalItem(500, 2, false)).toBe(1000);
      expect(calcularSubtotalItem(120.5, 3, undefined)).toBe(361.5);
    });

    it('debe calcular subtotal al peso con fórmula (Gramos / 100) * Precio_cada_100g', () => {
      // 100g a $1200 cada 100g = $1200
      expect(calcularSubtotalItem(1200, 100, true)).toBe(1200);
      // 150g a $1200 cada 100g = (150/100) * 1200 = 1.5 * 1200 = $1800
      expect(calcularSubtotalItem(1200, 150, true)).toBe(1800);
      // 250g a $1200 cada 100g = 2.5 * 1200 = $3000
      expect(calcularSubtotalItem(1200, 250, true)).toBe(3000);
      // 50g a $800 cada 100g = 0.5 * 800 = $400
      expect(calcularSubtotalItem(800, 50, true)).toBe(400);
    });
  });
});
