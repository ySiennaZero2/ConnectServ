import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl border border-slate-200 bg-white px-8 py-12">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
        {icon}
      </View>
      <Text className="text-center text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mt-2 text-center leading-5 text-slate-500">{description}</Text>
    </View>
  );
}
