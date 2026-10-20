import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { catalogService } from '@/services/catalog';
import { useAppStore } from '@/store/useAppStore';
import type { CatalogItem } from '@/types';

export function useProviderCatalog() {
  const localItems = useAppStore((state) => state.catalogItems);
  const userId = useAppStore((state) => state.currentUser?.id);
  const [remoteItems, setRemoteItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured || !userId) return;
    setLoading(true);
    setError('');
    try { setRemoteItems(await catalogService.list()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao carregar catálogo.'); }
    finally { setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { items: isSupabaseConfigured ? remoteItems : localItems.filter((item) => item.providerId === userId),
    loading, error, reload };
}
