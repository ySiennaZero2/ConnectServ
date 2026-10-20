import { Check, ChevronDown, MapPin, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import { valeCities, type ValeCity } from '@/data/valeCities';

type CitySelectorProps = {
  value: ValeCity;
  onChange: (city: ValeCity) => void;
  className?: string;
};

export function CitySelector({ value, onChange, className = '' }: CitySelectorProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const filteredCities = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized
      ? valeCities.filter((city) => city.toLocaleLowerCase('pt-BR').includes(normalized))
      : valeCities;
  }, [query]);

  return (
    <>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Selecionar cidade. Atual: ${value}`}
        onPress={() => setVisible(true)}
        className={`flex-row items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-2.5 ${className}`}
      >
        <MapPin size={16} color={colors.brand700} fill={colors.brand100} />
        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wide text-brand-500">
            Cidade do atendimento
          </Text>
          <Text className="font-extrabold text-brand-800" numberOfLines={1}>
            {value}
          </Text>
        </View>
        <ChevronDown size={18} color={colors.brand700} />
      </AnimatedPressable>

      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <View className="flex-1 justify-end bg-slate-950/40">
          <View
            className="max-h-[88%] rounded-t-[32px] bg-white px-5"
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          >
            <View className="flex-row items-center justify-between pb-4 pt-5">
              <View>
                <Text className="text-xl font-black text-slate-950">Escolha a cidade</Text>
                <Text className="mt-1 text-sm text-slate-500">Vale do Ribeira e divisas principais</Text>
              </View>
              <AnimatedPressable
                accessibilityLabel="Fechar seletor de cidade"
                onPress={() => setVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={20} color={colors.slate700} />
              </AnimatedPressable>
            </View>

            <View className="mb-3 flex-row items-center rounded-2xl bg-slate-100 px-4">
              <Search size={18} color={colors.slate500} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar cidade"
                placeholderTextColor={colors.slate400}
                className="min-h-12 flex-1 px-3 text-slate-900"
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredCities.map((city) => {
                const selected = city === value;
                return (
                  <AnimatedPressable
                    key={city}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(city);
                      setVisible(false);
                      setQuery('');
                    }}
                    className={`mb-2 flex-row items-center rounded-2xl border px-4 py-3.5 ${
                      selected
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <Text
                      className={`flex-1 font-bold ${
                        selected ? 'text-brand-800' : 'text-slate-700'
                      }`}
                    >
                      {city}
                    </Text>
                    {selected ? <Check size={19} color={colors.brand700} /> : null}
                  </AnimatedPressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
