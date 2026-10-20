import { AlertTriangle, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AccountSectionHeader } from '@/components/account/AccountSectionHeader';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { providersService } from '@/services/providers';
import { useAppStore } from '@/store/useAppStore';
import type { UserRole } from '@/types';

type SecurityPrivacyScreenProps = {
  role: UserRole;
  onBack: () => void;
  onAccountDeleted: () => void;
};

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
};

function PasswordField({ label, value, onChangeText, autoComplete }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-slate-700">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
        <LockKeyhole size={18} color={colors.slate400} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete={autoComplete}
          placeholder="••••••••"
          placeholderTextColor={colors.slate400}
          className="min-h-14 flex-1 px-3 text-base text-slate-900"
        />
        <AnimatedPressable
          accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onPress={() => setVisible((current) => !current)}
          hitSlop={8}
        >
          {visible ? (
            <EyeOff size={20} color={colors.slate500} />
          ) : (
            <Eye size={20} color={colors.slate500} />
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

export function SecurityPrivacyScreen({
  role,
  onBack,
  onAccountDeleted,
}: SecurityPrivacyScreenProps) {
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const setProviderProfileHidden = useAppStore((state) => state.setProviderProfileHidden);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const professional = role === 'provider';

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 6 || newPassword !== confirmPassword) {
      Alert.alert(
        'Revise as senhas',
        'Informe a senha atual, uma nova senha com pelo menos 6 caracteres e confirme corretamente.',
      );
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Escolha outra senha', 'A nova senha deve ser diferente da senha atual.');
      return;
    }

    setSavingPassword(true);
    setPasswordSaved(false);
    try {
      if (isSupabaseConfigured) {
        await authService.changePassword(currentPassword, newPassword);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSaved(true);
    } catch (error) {
      Alert.alert(
        'Não foi possível alterar a senha',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleVacationMode = async (hidden: boolean) => {
    setProviderProfileHidden(hidden);
    try {
      if (isSupabaseConfigured) await providersService.setProfileHidden(hidden);
    } catch (error) {
      setProviderProfileHidden(!hidden);
      Alert.alert(
        'Não foi possível atualizar',
        error instanceof Error ? error.message : 'Tente novamente.',
      );
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (isSupabaseConfigured) await authService.deleteMyAccount();
      setDeleteVisible(false);
      onAccountDeleted();
    } catch (error) {
      Alert.alert(
        'Não foi possível excluir a conta',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen className="bg-slate-50">
      <AccountSectionHeader
        title="Segurança e privacidade"
        subtitle={professional ? 'Proteção da conta profissional' : 'Proteção da sua conta'}
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
          <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
                <ShieldCheck size={21} color={colors.brand700} />
              </View>
              <View className="flex-1">
                <Text className="font-black text-slate-950">Alterar senha</Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  Use pelo menos 6 caracteres e evite senhas repetidas.
                </Text>
              </View>
            </View>

            {passwordSaved ? (
              <View className="mt-4 flex-row items-center gap-2 rounded-2xl bg-emerald-50 p-3">
                <CheckCircle2 size={19} color={colors.success} />
                <Text className="flex-1 text-sm font-bold text-emerald-700">
                  Senha alterada com sucesso.
                </Text>
              </View>
            ) : null}

            <View className="mt-5 gap-4">
              <PasswordField
                label="Senha atual"
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  setPasswordSaved(false);
                }}
                autoComplete="current-password"
              />
              <PasswordField
                label="Nova senha"
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setPasswordSaved(false);
                }}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirmar nova senha"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setPasswordSaved(false);
                }}
                autoComplete="new-password"
              />
            </View>
            <View className="mt-5">
              <Button
                label="Atualizar senha"
                loading={savingPassword}
                onPress={handleChangePassword}
              />
            </View>
          </View>

          {professional ? (
            <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
              <Text className="font-black text-slate-950">Privacidade de dados</Text>
              <View className="mt-4 flex-row items-center gap-4 rounded-2xl bg-slate-50 p-4">
                <View className="flex-1">
                  <Text className="font-extrabold text-slate-800">
                    Ocultar meu perfil temporariamente das buscas
                  </Text>
                  <Text className="mt-1 text-xs leading-5 text-slate-500">
                    Ative o modo férias. Seus agendamentos existentes continuam disponíveis.
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Modo férias"
                  value={provider?.profileHidden ?? false}
                  onValueChange={handleVacationMode}
                  trackColor={{ false: colors.slate200, true: colors.brand300 }}
                  thumbColor={provider?.profileHidden ? colors.brand700 : colors.white}
                />
              </View>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-red-100 bg-white p-5">
            <Text className="font-black text-slate-950">Gerenciamento de conta</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              A exclusão remove seus dados e não pode ser desfeita.
            </Text>
            <View className="mt-4">
              <Button
                label={professional ? 'Excluir conta profissional' : 'Excluir minha conta'}
                variant="danger"
                icon={<Trash2 size={18} color={colors.danger} />}
                onPress={() => setDeleteVisible(true)}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={deleteVisible}
        onRequestClose={() => setDeleteVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-slate-950/50 px-5">
          <View className="w-full rounded-3xl bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <AlertTriangle size={24} color={colors.danger} />
              </View>
              <AnimatedPressable
                accessibilityLabel="Fechar confirmação"
                onPress={() => setDeleteVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={20} color={colors.slate700} />
              </AnimatedPressable>
            </View>
            <Text className="mt-5 text-xl font-black text-slate-950">
              {professional ? 'Excluir conta profissional?' : 'Excluir sua conta?'}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">
              Esta ação é permanente. Histórico, avaliações, solicitações e dados do perfil serão removidos.
            </Text>
            <View className="mt-6 gap-3">
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setDeleteVisible(false)}
              />
              <Button
                label="Sim, excluir permanentemente"
                variant="danger"
                loading={deleting}
                onPress={handleDelete}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
