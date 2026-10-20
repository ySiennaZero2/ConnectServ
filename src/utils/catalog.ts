import type { AppointmentItem, CatalogItem, SelectedItem } from '@/types';

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function snapshotItems(catalog: CatalogItem[], selected: SelectedItem[]): AppointmentItem[] {
  const seen = new Set<string>();
  return selected.map(({ catalogItemId, quantity }) => {
    const item = catalog.find((entry) => entry.id === catalogItemId);
    if (!item || seen.has(catalogItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
      throw new Error('Revise os itens e as quantidades (1 a 9999).');
    }
    seen.add(catalogItemId);
    return { catalogItemId, quantity, name: item.name, description: item.description,
      kind: item.kind, unitCost: item.kind === 'product' ? item.costPrice : 0, unitPrice: item.salePrice };
  });
}

export function itemTotals(items: AppointmentItem[]) {
  return {
    price: roundMoney(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)),
    cost: roundMoney(items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0)),
  };
}

export function validateCatalogItem(item: Omit<CatalogItem, 'id' | 'providerId'>) {
  if (!item.name.trim() || item.name.trim().length > 120 || item.description.length > 2000 ||
    !['product', 'service'].includes(item.kind) ||
    !Number.isFinite(item.salePrice) || item.salePrice < 0 || item.salePrice > 99999999.99 ||
    !Number.isFinite(item.costPrice) || item.costPrice < 0 || item.costPrice > 99999999.99) {
    throw new Error('Informe nome e valores válidos, maiores ou iguais a zero.');
  }
}
