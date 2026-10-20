import { Text, View } from 'react-native';

type LogoProps = {
  compact?: boolean;
  inverted?: boolean;
  hero?: boolean;
};

function BrandMark({ compact, inverted, hero }: Required<LogoProps>) {
  return (
    <View
      className={`relative items-center justify-center ${
        hero
          ? 'h-28 w-28'
          : compact
            ? 'h-10 w-10 rounded-xl bg-brand-50'
            : `h-14 w-14 rounded-2xl ${inverted ? 'bg-white/20' : 'bg-brand-50'}`
      }`}
    >
      <Text
        className={`${hero ? 'text-[82px]' : compact ? 'text-3xl' : 'text-5xl'} font-black leading-none ${
          inverted ? 'text-white' : 'text-brand-600'
        }`}
      >
        C
      </Text>
      <View
        className={`absolute rounded-full ${inverted ? 'bg-white' : 'bg-brand-600'} ${
          hero
            ? 'bottom-3 right-1 h-6 w-6 border-4 border-white'
            : compact
              ? 'bottom-1 right-1 h-2.5 w-2.5 border-2 border-brand-50'
              : 'bottom-1 right-1 h-4 w-4 border-2 border-brand-50'
        }`}
      />
    </View>
  );
}

export function Logo({ compact = false, inverted = false, hero = false }: LogoProps) {
  if (hero) {
    return (
      <View className="items-center">
        <BrandMark compact={false} inverted={false} hero />
        <Text className="mt-3 text-4xl font-black tracking-tight text-slate-950">
          Conecta<Text className="text-brand-600">Serv</Text>
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <BrandMark compact={compact} inverted={inverted} hero={false} />
      <View>
        <Text
          className={`${compact ? 'text-xl' : 'text-3xl'} font-extrabold tracking-tight ${
            inverted ? 'text-white' : 'text-slate-900'
          }`}
        >
          Conecta<Text className={inverted ? 'text-brand-200' : 'text-brand-700'}>Serv</Text>
        </Text>
        {!compact ? (
          <Text className={inverted ? 'text-brand-100' : 'text-slate-500'}>
            Serviço bom, perto de você.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
