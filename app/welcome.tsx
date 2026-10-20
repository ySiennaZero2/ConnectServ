import { router } from 'expo-router';
import { ArrowRight, Clock3, ShieldCheck, Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Logo } from '@/components/common/Logo';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Profissionais verificados',
    description: 'Segurança e confiança para você e sua família.',
  },
  {
    icon: Clock3,
    title: 'Agilidade',
    description: 'Encontre e contrate em poucos minutos.',
  },
  {
    icon: Star,
    title: 'Qualidade garantida',
    description: 'Avaliações reais de quem já contratou.',
  },
];

export default function WelcomeScreen() {
  return (
    <Screen bottomInset className="overflow-hidden bg-white">
      <View className="absolute -bottom-64 -left-52 h-[560px] w-[560px] rounded-full border border-brand-100" />
      <View className="absolute -bottom-44 -left-36 h-[430px] w-[430px] rounded-full border border-brand-100" />

      <View className="flex-1 px-7 pb-4 pt-12">
        <View className="items-center">
          <Logo hero />
          <Text className="mt-4 text-center text-lg leading-7 text-slate-700">
            Conectando você aos{'\n'}
            <Text className="font-extrabold text-brand-700">melhores prestadores</Text>
            {'\n'}de serviços.
          </Text>
        </View>

        <View className="mt-10 gap-6">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <View key={benefit.title} className="flex-row items-center gap-4">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
                  <Icon size={23} color={colors.white} fill={benefit.title === 'Qualidade garantida' ? colors.white : 'transparent'} />
                </View>
                <View className="flex-1">
                  <Text className="font-extrabold text-slate-900">{benefit.title}</Text>
                  <Text className="mt-1 text-sm leading-5 text-slate-500">{benefit.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="mt-auto">
          <AnimatedPressable
            accessibilityRole="button"
            onPress={() => router.navigate('/role-selection')}
            pressedOpacity={0.9}
            pressedScale={0.98}
            className="min-h-16 flex-row items-center rounded-[24px] bg-brand-600 px-3 active:bg-brand-700"
            style={{ shadowColor: colors.brand600, shadowOpacity: 0.25, shadowRadius: 16, elevation: 5 }}
          >
            <Text className="flex-1 text-center text-lg font-extrabold text-white">Começar</Text>
            <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
              <ArrowRight size={22} color={colors.brand700} />
            </View>
          </AnimatedPressable>

          <View className="mt-5 flex-row items-center justify-center gap-1 pb-2">
            <Text className="text-sm text-slate-500">Já tem uma conta?</Text>
            <AnimatedPressable
              onPress={() => router.navigate('/role-selection')}
              pressedOpacity={0.7}
              pressedScale={0.96}
            >
              <Text className="text-sm font-extrabold text-brand-700">Entrar</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}
