import { requireSupabase } from '@/lib/supabase';
import type { CatalogItem } from '@/types';
import { validateCatalogItem } from '@/utils/catalog';

type CatalogRow = { id: string; provider_id: string; kind: 'product' | 'service'; name: string;
  description: string; cost_price: number; sale_price: number };
const mapItem = (row: CatalogRow): CatalogItem => ({ id: row.id, providerId: row.provider_id,
  kind: row.kind, name: row.name, description: row.description,
  costPrice: Number(row.cost_price), salePrice: Number(row.sale_price) });

export const catalogService = {
  async list() {
    const items: CatalogItem[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await requireSupabase().from('provider_catalog_items')
        .select('*').is('deleted_at', null).order('name').order('id').range(offset, offset + pageSize - 1);
      if (error) throw new Error(error.message);
      items.push(...(data as CatalogRow[]).map(mapItem));
      if (data.length < pageSize) return items;
    }
  },
  async save(input: Omit<CatalogItem, 'id' | 'providerId'>, id?: string) {
    validateCatalogItem(input);
    const client = requireSupabase();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new Error('Entre novamente para salvar o item.');
    const values = { provider_id: auth.user.id, kind: input.kind, name: input.name.trim(),
      description: input.description.trim(), cost_price: input.kind === 'product' ? input.costPrice : 0,
      sale_price: input.salePrice };
    const query = id ? client.from('provider_catalog_items').update(values).eq('id', id).is('deleted_at', null)
      : client.from('provider_catalog_items').insert(values);
    const { data, error } = await query.select('*').single();
    if (error) throw new Error(error.message);
    return mapItem(data);
  },
  async remove(id: string) {
    const { error } = await requireSupabase().from('provider_catalog_items')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id).select('id').single();
    if (error) throw new Error(error.message);
  },
};
