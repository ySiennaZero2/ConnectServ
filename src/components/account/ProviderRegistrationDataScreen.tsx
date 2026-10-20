import {
  Building2,
  CheckCircle2,
  FileBadge2,
  Mail,
  MapPin,
  MessageCircle,
  UserRound,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import type { FiscalDocumentType, ProviderRegistrationData } from '@/types';
import {
  formatCep,
  formatCnpj,
  formatCpf,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/utils/documents';

type ProviderRegistrationDataScreenProps = {
  onBack: () => void;
};

function formatWhatsApp(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  const area = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${area}) ${number}`;
  if (number.length <= 8) return `(${area}) ${number.slice(0, 4)}-${number.slice(4)}`;
  return `(${area}) ${number.slice(0, 5)}-${number.slice(5)}`;
}

export function ProviderRegistrationDataScreen({
  onBack,
}: ProviderRegistrationDataScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const updateProviderRegistration = useAppStore(
    (state) => state.updateProviderRegistration,
  );
  const initialDocumentType: FiscalDocumentType =
    provider?.documentType ?? currentUser?.documentType ?? 'CPF';
  const [documentType, setDocumentType] =
    useState<FiscalDocumentType>(initialDocumentType);
  const [responsibleName, setResponsibleName] = useState(
    provider?.responsibleName ?? currentUser?.responsibleName ?? currentUser?.fullName ?? '',
  );
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [cpfCnpj, setCpfCnpj] = useState(
    initialDocumentType === 'CNPJ'
      ? formatCnpj(provider?.cpfCnpj ?? currentUser?.cpfCnpj ?? '')
      : formatCpf(provider?.cpfCnpj ?? currentUser?.cpfCnpj ?? ''),
  );
  const [legalName, setLegalName] = useState(provider?.legalName ?? currentUser?.legalName ?? '');
  const [tradeName, setTradeName] = useState(provider?.tradeName ?? currentUser?.tradeName ?? '');
  const [cep, setCep] = useState(formatCep(provider?.companyAddress?.cep ?? ''));
  const [street, setStreet] = useState(provider?.companyAddress?.street ?? '');
  const [number, setNumber] = useState(provider?.companyAddress?.number ?? '');
  const [district, setDistrict] = useState(provider?.companyAddress?.district ?? '');
  const [companyCity, setCompanyCity] = useState(provider?.companyAddress?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void authService
      .getMyProviderData()
      .then((data) => {
        if (!active) return;
        setDocumentType(data.documentType);
        setResponsibleName(data.responsibleName);
        setEmail(data.email);
        setPhone(formatWhatsApp(data.phone));
        setCpfCnpj(
          data.documentType === 'CNPJ'
            ? formatCnpj(data.cpfCnpj)
            : formatCpf(data.cpfCnpj),
        );
        setLegalName(data.legalName);
        setTradeName(data.tradeName);
        setCep(formatCep(data.companyAddress.cep));
        setStreet(data.companyAddress.street);
        setNumber(data.companyAddress.number);
        setDistrict(data.companyAddress.district);
        setCompanyCity(data.companyAddress.city);
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

  const markChanged = () => setSaved(false);

  const handleSave = async () => {
    const basicDataIsValid =
      responsibleName.trim().length >= 3 &&
      email.includes('@') &&
      onlyDigits(phone).length >= 10;
    const documentIsValid =
      documentType === 'CPF' ? isValidCpf(cpfCnpj) : isValidCnpj(cpfCnpj);
    const companyDataIsValid =
      documentType === 'CPF' ||
      (legalName.trim().length >= 3 &&
        tradeName.trim().length >= 2 &&
        onlyDigits(cep).length === 8 &&
        street.trim().length >= 3 &&
        number.trim().length >= 1 &&
        district.trim().length >= 2 &&
        companyCity.trim().length >= 2);

    if (!basicDataIsValid || !documentIsValid || !companyDataIsValid) {
      Alert.alert(
        'Revise seus dados',
        documentType === 'CNPJ'
          ? 'Informe os dados do responsável, um CNPJ válido e o endereço completo da empresa.'
          : 'Informe nome, e-mail, WhatsApp com DDD e um CPF válido.',
      );
      return;
    }

    const input: ProviderRegistrationData = {
      responsibleName: responsibleName.trim(),
      email: email.trim().toLowerCase(),
      phone: formatWhatsApp(phone),
      documentType,
      cpfCnpj: onlyDigits(cpfCnpj),
      legalName: documentType === 'CNPJ' ? legalName.trim() : '',
      tradeName: documentType === 'CNPJ' ? tradeName.trim() : '',
      companyAddress: {
        cep: documentType === 'CNPJ' ? onlyDigits(cep) : '',
        street: documentType === 'CNPJ' ? street.trim() : '',
        number: documentType === 'CNPJ' ? number.trim() : '',
        district: documentType === 'CNPJ' ? district.trim() : '',
        city: documentType === 'CNPJ' ? companyCity.trim() : '',
      },
    };

    setSaving(true);
    setSaved(false);
    try {
      if (isSupabaseConfigured) await authService.updateProviderRegistrationData(input);
      updateProviderRegistration(input);
      setPhone(input.phone);
      setCpfCnpj(
        documentType === 'CNPJ' ? formatCnpj(input.cpfCnpj) : formatCpf(input.cpfCnpj),
      );
      setCep(formatCep(input.companyAddress.cep));
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
        title="Dados pessoais e jurídicos"
        subtitle={documentType === 'CNPJ' ? 'Responsável e empresa' : 'Cadastro profissional'}
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
                  Seus dados profissionais foram atualizados com sucesso.
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-black text-slate-950">Dados do responsável</Text>
              <View className="rounded-full bg-brand-50 px-3 py-1.5">
                <Text className="text-xs font-black text-brand-700">
                  {documentType === 'CNPJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </Text>
              </View>
            </View>
            <View className="mt-5 gap-4">
              <DataInput
                label="Nome completo"
                icon={<UserRound size={19} color={colors.slate400} />}
                value={responsibleName}
                onChangeText={(value) => {
                  setResponsibleName(value);
                  markChanged();
                }}
                autoCapitalize="words"
              />
              <DataInput
                label="E-mail"
                icon={<Mail size={19} color={colors.slate400} />}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  markChanged();
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <DataInput
                label="Telefone / WhatsApp"
                icon={<MessageCircle size={19} color={colors.success} />}
                value={phone}
                onChangeText={(value) => {
                  setPhone(formatWhatsApp(value));
                  markChanged();
                }}
                keyboardType="phone-pad"
                placeholder="(13) 99999-9999"
              />
              <DataInput
                label={documentType}
                icon={<FileBadge2 size={19} color={colors.brand700} />}
                value={cpfCnpj}
                onChangeText={(value) => {
                  setCpfCnpj(documentType === 'CNPJ' ? formatCnpj(value) : formatCpf(value));
                  markChanged();
                }}
                keyboardType="number-pad"
                maxLength={documentType === 'CNPJ' ? 18 : 14}
                placeholder={documentType === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
              />
            </View>
          </View>

          {documentType === 'CNPJ' ? (
            <View className="mt-5 rounded-3xl border border-brand-100 bg-brand-50 p-5">
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                  <Building2 size={21} color={colors.brand700} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black text-brand-950">Dados da empresa</Text>
                  <Text className="mt-0.5 text-xs text-brand-700">
                    O Nome Fantasia é exibido nos cards públicos.
                  </Text>
                </View>
              </View>
              <View className="mt-5 gap-4">
                <DataInput
                  label="Razão Social"
                  value={legalName}
                  onChangeText={(value) => {
                    setLegalName(value);
                    markChanged();
                  }}
                  autoCapitalize="words"
                />
                <DataInput
                  label="Nome Fantasia"
                  value={tradeName}
                  onChangeText={(value) => {
                    setTradeName(value);
                    markChanged();
                  }}
                  autoCapitalize="words"
                />
                <View className="mt-1 flex-row items-center gap-2">
                  <MapPin size={18} color={colors.brand700} />
                  <Text className="text-sm font-black text-brand-900">Endereço físico</Text>
                </View>
                <DataInput
                  label="CEP"
                  value={cep}
                  onChangeText={(value) => {
                    setCep(formatCep(value));
                    markChanged();
                  }}
                  keyboardType="number-pad"
                  maxLength={9}
                  placeholder="00000-000"
                />
                <DataInput
                  label="Rua"
                  value={street}
                  onChangeText={(value) => {
                    setStreet(value);
                    markChanged();
                  }}
                  autoCapitalize="words"
                />
                <View className="flex-row gap-3">
                  <View className="w-28">
                    <DataInput
                      label="Número"
                      value={number}
                      onChangeText={(value) => {
                        setNumber(value);
                        markChanged();
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <DataInput
                      label="Bairro"
                      value={district}
                      onChangeText={(value) => {
                        setDistrict(value);
                        markChanged();
                      }}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <DataInput
                  label="Cidade"
                  value={companyCity}
                  onChangeText={(value) => {
                    setCompanyCity(value);
                    markChanged();
                  }}
                  autoCapitalize="words"
                />
              </View>
            </View>
          ) : null}

          {isSupabaseConfigured ? (
            <Text className="mt-4 text-xs leading-5 text-slate-400">
              Alterações de e-mail podem exigir confirmação na sua caixa de entrada.
            </Text>
          ) : null}

          <View className="mt-7">
            <Button label="Salvar alterações" loading={saving} onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DataInput({
  label,
  icon,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
  placeholder,
}: {
  label: string;
  icon?: ReactNode;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-slate-700">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          className={`min-h-14 flex-1 text-base text-slate-900 ${icon ? 'px-3' : ''}`}
        />
      </View>
    </View>
  );
}
