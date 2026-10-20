import { ArrowLeft } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';

type AccountSectionHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function AccountSectionHeader({
  title,
  subtitle,
  onBack,
}: AccountSectionHeaderProps) {
  return (
    <View className="flex-row items-center border-b border-slate-100 bg-white px-5 py-3">
      <AnimatedPressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        onPress={onBack}
        className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
      >
        <ArrowLeft size={22} color={colors.slate900} />
      </AnimatedPressable>
      <View className="flex-1 pr-10">
        <Text className="text-center text-base font-black text-slate-950">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-center text-[11px] text-slate-500">{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
