import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Search, ShieldCheck } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Logo } from '@/components/common/Logo';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import type { UserRole } from '@/types';

const roles: {
  id: UserRole;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Search;
}[] = [
  {
    id: 'client',
    eyebrow: 'Para clientes',
    title: 'Quero contratar',
    description: 'Encontre profissionais próximos, compare avaliações e agende pelo app.',
    icon: Search,
  },
  {
    id: 'provider',
    eyebrow: 'Para profissionais',
    title: 'Quero oferecer serviços',
    description: 'Divulgue seu trabalho, organize sua agenda e conquiste novos clientes.',
    icon: BriefcaseBusiness,
  },
];

export default function RoleSelectionScreen() {
  return (
    <Screen bottomInset className="bg-white">
      <View className="flex-1 px-5 pb-5">
        <View className="flex-row items-center justify-between py-4">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => router.back()}
            pressedScale={0.9}
            className="h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <ArrowLeft size={21} color={colors.slate900} />
          </AnimatedPressable>
          <Logo compact />
          <View className="h-11 w-11" />
        </View>

        <View className="mt-8">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
            <ShieldCheck size={24} color={colors.brand700} />
          </View>
          <Text className="text-3xl font-black leading-10 text-slate-950">Como você quer usar o ConectaServ?</Text>
          <Text className="mt-2 text-base leading-6 text-slate-500">Escolha um perfil para acessar uma experiência feita para você.</Text>
        </View>

        <View className="mt-8 gap-4">
          {roles.map((role, index) => {
            const Icon = role.icon;
            const primary = index === 0;
            return (
              <AnimatedPressable
                key={role.id}
                onPress={() => router.push({ pathname: '/auth', params: { role: role.id } })}
                pressedOpacity={0.92}
                pressedScale={0.98}
                className={`rounded-[28px] border p-5 active:opacity-90 ${
                  primary ? 'border-brand-600 bg-brand-600' : 'border-slate-200 bg-white'
                }`}
                style={{ shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 16, elevation: 2 }}
              >
                <View className="flex-row items-start gap-4">
                  <View className={`h-12 w-12 items-center justify-center rounded-2xl ${primary ? 'bg-white/20' : 'bg-brand-50'}`}>
                    <Icon size={24} color={primary ? colors.white : colors.brand700} />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-xs font-extrabold uppercase tracking-widest ${primary ? 'text-brand-100' : 'text-brand-700'}`}>{role.eyebrow}</Text>
                    <Text className={`mt-1 text-xl font-black ${primary ? 'text-white' : 'text-slate-950'}`}>{role.title}</Text>
                    <Text className={`mt-2 text-sm leading-5 ${primary ? 'text-brand-100' : 'text-slate-500'}`}>{role.description}</Text>
                  </View>
                  <ArrowRight size={21} color={primary ? colors.white : colors.brand700} />
                </View>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
