import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { formatCurrency } from '@/data/paymentMethods';
import { useProviderCatalog } from '@/hooks/useProviderCatalog';
import { isSupabaseConfigured } from '@/lib/supabase';
import { catalogService } from '@/services/catalog';
import { useAppStore } from '@/store/useAppStore';
import type { CatalogItem } from '@/types';

export default function ProductsScreen() {
  const { items, loading, error, reload } = useProviderCatalog();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState<CatalogItem['kind']>('product');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const open = (item?: CatalogItem) => {
    setEditing(item?.id ?? null); setKind(item?.kind ?? 'product'); setName(item?.name ?? '');
    setDescription(item?.description ?? ''); setCost(item ? String(Math.round(item.costPrice * 100)) : '');
    setPrice(item ? String(Math.round(item.salePrice * 100)) : ''); setMessage(''); setFormOpen(true);
  };
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      if (!price || (kind === 'product' && !cost)) throw new Error('Preencha os valores do item.');
      const input = { kind, name, description, costPrice: kind === 'product' ? Number(cost) / 100 : 0,
        salePrice: Number(price) / 100 };
      if (isSupabaseConfigured) await catalogService.save(input, editing ?? undefined);
      else useAppStore.getState().saveCatalogItem(input, editing ?? undefined);
      setFormOpen(false); await reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true); setMessage('');
    try {
      if (isSupabaseConfigured) await catalogService.remove(id);
      else useAppStore.getState().removeCatalogItem(id);
      setDeleting(null); await reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Não foi possível excluir.'); }
    finally { setBusy(false); }
  };
  const visible = items.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase('pt-BR')
    .includes(query.toLocaleLowerCase('pt-BR')));
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-5 gap-4 pb-10">
    <Button label="Voltar ao perfil" variant="ghost" onPress={() => router.back()} disabled={busy} />
    <Text className="text-2xl font-black text-slate-900">Produtos e serviços</Text>
    <Text className="text-slate-500">Cadastre seus preços para usar na conclusão dos atendimentos.</Text>
    <Button label="Cadastrar item" onPress={() => open()} disabled={busy} />
    {message || error ? <Text accessibilityRole="alert" className="text-red-700">{message || error}</Text> : null}
    {error ? <Button label="Tentar novamente" onPress={() => void reload()} /> : null}
    {formOpen ? <View className="gap-3 rounded-3xl bg-white p-4">
      <Text className="text-lg font-bold">{editing ? 'Editar item' : 'Novo item'}</Text>
      <View className="flex-row gap-2">{(['product', 'service'] as const).map((value) =>
        <Button key={value} label={value === 'product' ? 'Produto' : 'Serviço'} fullWidth={false}
          variant={kind === value ? 'primary' : 'secondary'} onPress={() => setKind(value)} disabled={busy} />)}</View>
      <Text>Nome</Text><TextInput accessibilityLabel="Nome" value={name} onChangeText={setName}
        maxLength={120} editable={!busy} className="rounded-xl border border-slate-200 p-3" />
      <Text>Descrição</Text><TextInput accessibilityLabel="Descrição" value={description} onChangeText={setDescription}
        maxLength={2000} multiline editable={!busy} className="rounded-xl border border-slate-200 p-3" />
      {kind === 'product' ? <><Text>Preço de custo</Text><TextInput accessibilityLabel="Preço de custo"
        value={cost ? formatCurrency(Number(cost) / 100) : ''} keyboardType="number-pad" placeholder="R$ 0,00"
        onChangeText={(value) => setCost(value.replace(/\D/g, '').slice(0, 10))} editable={!busy}
        className="rounded-xl border border-slate-200 p-3" /></> : null}
      <Text>{kind === 'product' ? 'Preço de venda/cobrança' : 'Valor base/sugerido'}</Text>
      <TextInput accessibilityLabel="Valor de cobrança" value={price ? formatCurrency(Number(price) / 100) : ''}
        keyboardType="number-pad" placeholder="R$ 0,00" editable={!busy}
        onChangeText={(value) => setPrice(value.replace(/\D/g, '').slice(0, 10))}
        className="rounded-xl border border-slate-200 p-3" />
      <Button label="Salvar item" onPress={() => void save()} loading={busy} />
      <Button label="Cancelar edição" variant="ghost" disabled={busy} onPress={() => setFormOpen(false)} />
    </View> : null}
    <TextInput accessibilityLabel="Pesquisar produtos e serviços" placeholder="Pesquisar por nome ou descrição"
      value={query} onChangeText={setQuery} className="rounded-xl border border-slate-200 bg-white p-4" />
    {loading ? <Text>Carregando catálogo...</Text> : !visible.length ? <Text className="text-slate-500">
      {items.length ? 'Nenhum resultado para esta pesquisa.' : 'Nenhum item cadastrado.'}</Text> : null}
    {visible.map((item) => <View key={item.id} className="gap-2 rounded-2xl bg-white p-4">
      <Text className="text-xs font-bold text-brand-700">{item.kind === 'product' ? 'PRODUTO' : 'SERVIÇO'}</Text>
      <Text className="text-lg font-bold text-slate-900">{item.name}</Text>
      <Text className="text-slate-500">{item.description}</Text>
      <Text>Cobrança: {formatCurrency(item.salePrice)}{item.kind === 'product' ? ` · Custo: ${formatCurrency(item.costPrice)}` : ''}</Text>
      {deleting === item.id ? <><Text>Excluir este item do catálogo? O histórico será preservado.</Text>
        <Button label="Confirmar exclusão" variant="danger" loading={busy} onPress={() => void remove(item.id)} />
        <Button label="Cancelar" variant="ghost" disabled={busy} onPress={() => setDeleting(null)} /></> :
        <View className="flex-row gap-2"><Button label="Editar" variant="secondary" fullWidth={false} disabled={busy} onPress={() => open(item)} />
          <Button label="Excluir" variant="danger" fullWidth={false} disabled={busy} onPress={() => setDeleting(item.id)} /></View>}
    </View>)}
  </ScrollView></Screen>;
}
