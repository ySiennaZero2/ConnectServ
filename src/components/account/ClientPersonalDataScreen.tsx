import { CheckCircle2, FileBadge2, Mail, MessageCircle, UserRound } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AccountSectionHeader } from '@/components/account/AccountSectionHeader';
import { Button } from '@/components/common/Button';
import { CitySelector } from '@/components/common/CitySelector';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { defaultValeCity, isValeCity, type ValeCity } from '@/data/valeCities';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import { formatCpf, isValidCpf } from '@/utils/documents';

type ClientPersonalDataScreenProps = {
  onBack: () => void;
};

function formatWhatsApp(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${area}) ${number}`;
  if (number.length <= 8) return `(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${area}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function ClientPersonalDataScreen({ onBack }: ClientPersonalDataScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const selectedServiceCity = useAppStore((state) => state.selectedServiceCity);
  const updateCurrentUser = useAppStore((state) => state.updateCurrentUser);
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [cpf, setCpf] = useState(formatCpf(currentUser?.cpf ?? ''));
  const [city, setCity] = useState<ValeCity>(
    isValeCity(currentUser?.city) ? currentUser.city : selectedServiceCity ?? defaultValeCity,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void authService
      .getMyClientData()
      .then((data) => {
        if (!active) return;
        setFullName(data.fullName);
        setEmail(data.email);
        setPhone(formatWhatsApp(data.phone));
        setCpf(formatCpf(data.cpf));
        if (isValeCity(data.city)) setCity(data.city);
      })
      .catch((error) => {
        if (active) {
          Alert.alert(
            'Não foi possível carregar seus dados',
            error instanceof Error ? error.message : 'Tente novamente em instantes.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (
      fullName.trim().length < 3 ||
      !email.includes('@') ||
      phoneDigits.length < 10 ||
      !isValidCpf(cpf)
    ) {
      Alert.alert(
        'Revise seus dados',
        'Informe nome completo, e-mail válido, WhatsApp com DDD e um CPF válido.',
      );
      return;
    }

    setSaving(true);
    setSaved(false);
    try {
      const input = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: formatWhatsApp(phone),
        city,
        cpf: cpf.replace(/\D/g, ''),
      };
      if (isSupabaseConfigured) await authService.updatePersonalData(input);
      updateCurrentUser(input);
      setPhone(input.phone);
      setCpf(formatCpf(input.cpf));
      setSaved(true);
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen className="bg-slate-50">
      <AccountSectionHeader
        title="Dados pessoais"
        subtitle="Informações da sua conta"
        onBack={onBack}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-8"
        >
          {saved ? (
            <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-emerald-50 p-4">
              <CheckCircle2 size={21} color={colors.success} />
              <View className="flex-1">
                <Text className="font-extrabold text-emerald-800">Alterações salvas</Text>
                <Text className="mt-0.5 text-xs text-emerald-700">
                  Seus dados cadastrais e sua cidade principal foram atualizados.
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
            <Text className="text-base font-black text-slate-950">Informações básicas</Text>
            <View className="mt-5 gap-4">
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">Nome completo</Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 px-4">
                  <UserRound size={19} color={colors.slate400} />
                  <TextInput
                    value={fullName}
                    onChangeText={(value) => {
                      setFullName(value);
                      setSaved(false);
                    }}
                    autoCapitalize="words"
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">CPF</Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 px-4">
                  <FileBadge2 size={19} color={colors.brand700} />
                  <TextInput
                    value={cpf}
                    onChangeText={(value) => {
                      setCpf(formatCpf(value));
                      setSaved(false);
                    }}
                    keyboardType="number-pad"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    placeholderTextColor={colors.slate400}
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
              </View>

              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">E-mail</Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 px-4">
                  <Mail size={19} color={colors.slate400} />
                  <TextInput
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setSaved(false);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
                {isSupabaseConfigured ? (
                  <Text className="mt-1.5 text-xs leading-4 text-slate-400">
                    Uma alteração de e-mail pode exigir confirmação na sua caixa de entrada.
                  </Text>
                ) : null}
              </View>

              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">WhatsApp</Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 px-4">
                  <MessageCircle size={19} color={colors.success} />
                  <TextInput
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(formatWhatsApp(value));
                      setSaved(false);
                    }}
                    keyboardType="phone-pad"
                    placeholder="(13) 99999-9999"
                    placeholderTextColor={colors.slate400}
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
              </View>
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-2 text-sm font-bold text-slate-700">Cidade principal de busca</Text>
            <CitySelector
              value={city}
              onChange={(value) => {
                setCity(value);
                setSaved(false);
              }}
            />
          </View>

          <View className="mt-7">
            <Button label="Salvar alterações" loading={saving} onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
