import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  FileBadge2,
  Info,
  LockKeyhole,
  Mail,
  MapPin,
  UserRound,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import type { FiscalDocumentType, ProviderRegistrationData, UserRole } from '@/types';
import {
  formatCep,
  formatCnpj,
  formatCpf,
  isValidCnpj,
  isValidCpf,
  onlyDigits,
} from '@/utils/documents';

export default function AuthScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role: UserRole = params.role === 'provider' ? 'provider' : 'client';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<FiscalDocumentType>('CPF');
  const [fiscalDocument, setFiscalDocument] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [companyStreet, setCompanyStreet] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [companyDistrict, setCompanyDistrict] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyCep, setCompanyCep] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const loginAs = useAppStore((state) => state.loginAs);

  const labels = useMemo(
    () =>
      role === 'client'
        ? { role: 'Cliente', action: 'contratar serviços' }
        : { role: 'Profissional', action: 'oferecer serviços' },
    [role],
  );

  const enterApp = (
    name?: string,
    userEmail?: string,
    registration?: { cpf?: string; provider?: ProviderRegistrationData },
  ) => {
    loginAs(role, name, userEmail, registration);
    router.replace(
      role === 'client'
        ? '/(client)/(tabs)/home'
        : '/(provider)/(tabs)/dashboard',
    );
  };

  const handleSubmit = async () => {
    if (
      !email.includes('@') ||
      password.length < 6 ||
      (mode === 'register' && fullName.trim().length < 3)
    ) {
      Alert.alert(
        'Revise seus dados',
        'Informe um nome válido, um e-mail e uma senha com pelo menos 6 caracteres.',
      );
      return;
    }

    if (mode === 'register') {
      const validDocument =
        documentType === 'CPF'
          ? isValidCpf(fiscalDocument)
          : isValidCnpj(fiscalDocument);
      if (!validDocument) {
        Alert.alert(
          `${documentType} inválido`,
          `Confira os números informados no ${documentType} e tente novamente.`,
        );
        return;
      }

      if (
        role === 'provider' &&
        documentType === 'CNPJ' &&
        (legalName.trim().length < 3 ||
          tradeName.trim().length < 2 ||
          companyStreet.trim().length < 3 ||
          !companyNumber.trim() ||
          companyDistrict.trim().length < 2 ||
          companyCity.trim().length < 2 ||
          onlyDigits(companyCep).length !== 8)
      ) {
        Alert.alert(
          'Complete os dados da empresa',
          'Informe Razão Social, Nome Fantasia, CEP e o endereço físico completo.',
        );
        return;
      }
    }

    setLoading(true);
    try {
      let authenticatedName =
        mode === 'register' && role === 'provider' && documentType === 'CNPJ'
          ? tradeName.trim()
          : fullName || undefined;
      if (isSupabaseConfigured) {
        if (mode === 'register') {
          const result = await authService.signUp({
            email,
            password,
            fullName,
            role,
            ...(role === 'client'
              ? { cpf: fiscalDocument }
              : {
                  documentType,
                  cpfCnpj: fiscalDocument,
                  ...(documentType === 'CNPJ'
                    ? {
                        legalName,
                        tradeName,
                        companyAddress: {
                          cep: companyCep,
                          street: companyStreet,
                          number: companyNumber,
                          district: companyDistrict,
                          city: companyCity,
                        },
                      }
                    : {}),
                }),
          });
          if (result.confirmationRequired) {
            Alert.alert(
              'Confirme seu e-mail',
              'Sua conta foi criada. Abra o link enviado por e-mail e depois faça login.',
            );
            setMode('login');
            return;
          }
        } else {
          const result = await authService.signIn({ email, password, expectedRole: role });
          authenticatedName = result.profile.full_name;
        }
      }
      const localRegistration =
        mode === 'register'
          ? role === 'client'
            ? { cpf: onlyDigits(fiscalDocument) }
            : {
                provider: {
                  responsibleName: fullName.trim(),
                  email: email.trim().toLowerCase(),
                  phone: '',
                  documentType,
                  cpfCnpj: onlyDigits(fiscalDocument),
                  legalName: documentType === 'CNPJ' ? legalName.trim() : '',
                  tradeName: documentType === 'CNPJ' ? tradeName.trim() : '',
                  companyAddress: {
                    cep: documentType === 'CNPJ' ? onlyDigits(companyCep) : '',
                    street: documentType === 'CNPJ' ? companyStreet.trim() : '',
                    number: documentType === 'CNPJ' ? companyNumber.trim() : '',
                    district: documentType === 'CNPJ' ? companyDistrict.trim() : '',
                    city: documentType === 'CNPJ' ? companyCity.trim() : '',
                  },
                },
              }
          : undefined;
      enterApp(authenticatedName, email, localRegistration);
    } catch (error) {
      Alert.alert(
        mode === 'register' ? 'Não foi possível criar a conta' : 'Não foi possível entrar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen bottomInset>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-5 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between py-4">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <ArrowLeft size={22} color={colors.slate700} />
            </Pressable>
            <Logo compact />
            <View className="h-11 w-11" />
          </View>

          <View className="mt-6">
            <Text className="text-sm font-bold uppercase tracking-widest text-brand-700">
              Acesso de {labels.role}
            </Text>
            <Text className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' ? 'Que bom ver você!' : 'Crie sua conta'}
            </Text>
            <Text className="mt-2 leading-6 text-slate-500">
              Entre para {labels.action} com segurança.
            </Text>
          </View>

          <View className="mt-8 gap-4">
            {mode === 'register' && role === 'provider' ? (
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">Tipo de cadastro</Text>
                <View className="flex-row rounded-2xl bg-slate-100 p-1">
                  {(['CPF', 'CNPJ'] as const).map((type) => {
                    const selected = documentType === type;
                    return (
                      <Pressable
                        key={type}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => {
                          setDocumentType(type);
                          setFiscalDocument('');
                        }}
                        className={`min-h-12 flex-1 items-center justify-center rounded-xl px-2 ${
                          selected ? 'bg-brand-700' : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`text-center text-xs font-black ${
                            selected ? 'text-white' : 'text-slate-600'
                          }`}
                        >
                          {type === 'CPF' ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {mode === 'register' ? (
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {role === 'provider' && documentType === 'CNPJ'
                    ? 'Nome completo do responsável'
                    : 'Nome completo'}
                </Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                  <UserRound size={19} color={colors.slate400} />
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Como devemos chamar você?"
                    placeholderTextColor={colors.slate400}
                    autoCapitalize="words"
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
              </View>
            ) : null}

            {mode === 'register' ? (
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {role === 'client' || documentType === 'CPF' ? 'CPF' : 'CNPJ'}
                </Text>
                <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                  <FileBadge2 size={19} color={colors.slate400} />
                  <TextInput
                    value={fiscalDocument}
                    onChangeText={(value) =>
                      setFiscalDocument(
                        role === 'client' || documentType === 'CPF'
                          ? formatCpf(value)
                          : formatCnpj(value),
                      )
                    }
                    placeholder={
                      role === 'client' || documentType === 'CPF'
                        ? '000.000.000-00'
                        : '00.000.000/0001-00'
                    }
                    placeholderTextColor={colors.slate400}
                    keyboardType="number-pad"
                    maxLength={role === 'client' || documentType === 'CPF' ? 14 : 18}
                    className="min-h-14 flex-1 px-3 text-base text-slate-900"
                  />
                </View>
              </View>
            ) : null}

            {mode === 'register' && role === 'provider' && documentType === 'CNPJ' ? (
              <View className="gap-4 rounded-3xl border border-brand-100 bg-brand-50 p-4">
                <View className="flex-row items-center gap-2">
                  <Building2 size={20} color={colors.brand700} />
                  <View className="flex-1">
                    <Text className="font-black text-brand-900">Dados da empresa</Text>
                    <Text className="mt-0.5 text-xs text-brand-700">
                      O Nome Fantasia será exibido publicamente nos cards.
                    </Text>
                  </View>
                </View>

                <RegistrationInput
                  label="Razão Social"
                  value={legalName}
                  onChangeText={setLegalName}
                  placeholder="Nome empresarial registrado"
                />
                <RegistrationInput
                  label="Nome Fantasia"
                  value={tradeName}
                  onChangeText={setTradeName}
                  placeholder="Nome exibido aos clientes"
                />

                <View className="mt-1 flex-row items-center gap-2">
                  <MapPin size={18} color={colors.brand700} />
                  <Text className="text-sm font-black text-brand-900">Endereço físico</Text>
                </View>
                <RegistrationInput
                  label="CEP"
                  value={companyCep}
                  onChangeText={(value) => setCompanyCep(formatCep(value))}
                  placeholder="00000-000"
                  keyboardType="number-pad"
                  maxLength={9}
                />
                <RegistrationInput
                  label="Rua"
                  value={companyStreet}
                  onChangeText={setCompanyStreet}
                  placeholder="Logradouro"
                />
                <View className="flex-row gap-3">
                  <View className="w-28">
                    <RegistrationInput
                      label="Número"
                      value={companyNumber}
                      onChangeText={setCompanyNumber}
                      placeholder="123"
                    />
                  </View>
                  <View className="flex-1">
                    <RegistrationInput
                      label="Bairro"
                      value={companyDistrict}
                      onChangeText={setCompanyDistrict}
                      placeholder="Bairro"
                    />
                  </View>
                </View>
                <RegistrationInput
                  label="Cidade"
                  value={companyCity}
                  onChangeText={setCompanyCity}
                  placeholder="Cidade da empresa"
                />
              </View>
            ) : null}

            <View>
              <Text className="mb-2 text-sm font-bold text-slate-700">E-mail</Text>
              <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                <Mail size={19} color={colors.slate400} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="voce@email.com"
                  placeholderTextColor={colors.slate400}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  className="min-h-14 flex-1 px-3 text-base text-slate-900"
                />
              </View>
            </View>

            <View>
              <Text className="mb-2 text-sm font-bold text-slate-700">Senha</Text>
              <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                <LockKeyhole size={19} color={colors.slate400} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo de 6 caracteres"
                  placeholderTextColor={colors.slate400}
                  secureTextEntry={!showPassword}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="min-h-14 flex-1 px-3 text-base text-slate-900"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  onPress={() => setShowPassword((value) => !value)}
                  hitSlop={8}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.slate500} />
                  ) : (
                    <Eye size={20} color={colors.slate500} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          {!isSupabaseConfigured ? (
            <View className="mt-5 flex-row gap-3 rounded-2xl bg-brand-50 p-4">
              <Info size={19} color={colors.brand700} />
              <Text className="flex-1 text-sm leading-5 text-brand-800">
                Modo demonstração ativo. Use qualquer e-mail e uma senha de 6 caracteres, ou entre direto abaixo.
              </Text>
            </View>
          ) : null}

          <View className="mt-7 gap-3">
            <Button
              label={mode === 'login' ? 'Entrar' : 'Criar conta'}
              onPress={handleSubmit}
              loading={loading}
            />
            {!isSupabaseConfigured ? (
              <Button
                label={`Explorar como ${labels.role}`}
                variant="secondary"
                onPress={() => enterApp()}
              />
            ) : null}
          </View>

          <View className="mt-7 flex-row items-center justify-center gap-1">
            <Text className="text-slate-500">
              {mode === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
            </Text>
            <Pressable onPress={() => setMode((value) => (value === 'login' ? 'register' : 'login'))}>
              <Text className="font-bold text-brand-700">
                {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function RegistrationInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
}) {
  return (
    <View>
      <Text className="mb-2 text-xs font-bold text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate400}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize="words"
        className="min-h-13 rounded-2xl border border-brand-100 bg-white px-4 text-sm text-slate-900"
      />
    </View>
  );
}
