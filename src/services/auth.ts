import {
  AUTH_EMAIL_REDIRECT_URL,
  isSupabaseConfigured,
  requireSupabase,
} from '@/lib/supabase';
import type {
  ClientRegistrationData,
  FiscalDocumentType,
  ProviderRegistrationData,
  UserRole,
} from '@/types';
import type { ValeCity } from '@/data/valeCities';
import { onlyDigits } from '@/utils/documents';

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  cpf?: string;
  documentType?: FiscalDocumentType;
  cpfCnpj?: string;
  legalName?: string;
  tradeName?: string;
  companyAddress?: {
    cep: string;
    street: string;
    number: string;
    district: string;
    city: string;
  };
};

type SignInInput = {
  email: string;
  password: string;
  expectedRole: UserRole;
};

export { isSupabaseConfigured };

export const authService = {
  async signUp(input: SignUpInput) {
    const client = requireSupabase();
    const companyAddress = input.companyAddress;
    const { data, error } = await client.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo: AUTH_EMAIL_REDIRECT_URL,
        data: {
          full_name: input.fullName.trim(),
          role: input.role,
          ...(input.role === 'client' && input.cpf
            ? { cpf: onlyDigits(input.cpf) }
            : {}),
          ...(input.role === 'provider' && input.documentType && input.cpfCnpj
            ? {
                tipo_documento: input.documentType,
                cpf_cnpj: onlyDigits(input.cpfCnpj),
                ...(input.documentType === 'CNPJ'
                  ? {
                      razao_social: input.legalName?.trim(),
                      nome_fantasia: input.tradeName?.trim(),
                      cep: onlyDigits(companyAddress?.cep ?? ''),
                      logradouro: companyAddress?.street.trim(),
                      numero: companyAddress?.number.trim(),
                      bairro: companyAddress?.district.trim(),
                      cidade_fisica: companyAddress?.city.trim(),
                    }
                  : {}),
              }
            : {}),
        },
      },
    });

    if (error) throw new Error(error.message);
    return { ...data, confirmationRequired: !data.session };
  },

  async signIn({ email, password, expectedRole }: SignInInput) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(error.message);

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw new Error('Não foi possível carregar o perfil desta conta.');
    if (profile.role !== expectedRole) {
      await client.auth.signOut();
      throw new Error(
        expectedRole === 'client'
          ? 'Esta conta foi criada como profissional. Use o acesso “Quero oferecer serviços”.'
          : 'Esta conta foi criada como cliente. Use o acesso “Quero contratar”.',
      );
    }
    return { ...data, profile };
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getMyClientData(): Promise<ClientRegistrationData> {
    const client = requireSupabase();
    const [{ data, error }, { data: userData }] = await Promise.all([
      client.rpc('get_my_registration_data'),
      client.auth.getUser(),
    ]);
    if (error) throw new Error(error.message);
    if (!userData.user || !data || data.role !== 'client') {
      throw new Error('Não foi possível carregar seus dados pessoais.');
    }
    return {
      fullName: data.full_name ?? '',
      email: userData.user.email ?? '',
      phone: data.phone ?? '',
      city: data.city ?? '',
      cpf: data.cpf ?? '',
    };
  },

  async getMyProviderData(): Promise<ProviderRegistrationData> {
    const client = requireSupabase();
    const [{ data, error }, { data: userData }] = await Promise.all([
      client.rpc('get_my_registration_data'),
      client.auth.getUser(),
    ]);
    if (error) throw new Error(error.message);
    if (!userData.user || !data || data.role !== 'provider') {
      throw new Error('Não foi possível carregar seus dados profissionais.');
    }
    return {
      responsibleName: data.responsible_name ?? '',
      email: userData.user.email ?? '',
      phone: data.phone ?? '',
      documentType: data.document_type === 'CNPJ' ? 'CNPJ' : 'CPF',
      cpfCnpj: data.cpf_cnpj ?? '',
      legalName: data.legal_name ?? '',
      tradeName: data.trade_name ?? '',
      companyAddress: {
        cep: data.cep ?? '',
        street: data.street ?? '',
        number: data.number ?? '',
        district: data.district ?? '',
        city: data.company_city ?? '',
      },
    };
  },

  async updatePersonalData(input: {
    fullName: string;
    email: string;
    phone: string;
    city: ValeCity;
    cpf: string;
  }) {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user) throw new Error('Sessão expirada. Entre novamente.');

    const normalizedEmail = input.email.trim().toLowerCase();
    if (userData.user.email !== normalizedEmail) {
      const { error: emailError } = await client.auth.updateUser({ email: normalizedEmail });
      if (emailError) throw new Error(emailError.message);
    }

    const { error } = await client.rpc('update_my_client_data', {
      p_full_name: input.fullName.trim(),
      p_phone: input.phone,
      p_city: input.city,
      p_cpf: onlyDigits(input.cpf),
    });
    if (error) throw new Error(error.message);
  },

  async updateProviderRegistrationData(input: ProviderRegistrationData) {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user) throw new Error('Sessão expirada. Entre novamente.');

    const normalizedEmail = input.email.trim().toLowerCase();
    if (userData.user.email !== normalizedEmail) {
      const { error: emailError } = await client.auth.updateUser({ email: normalizedEmail });
      if (emailError) throw new Error(emailError.message);
    }

    const { error } = await client.rpc('update_my_provider_registration_data', {
      p_responsible_name: input.responsibleName.trim(),
      p_phone: input.phone,
      p_cpf_cnpj: onlyDigits(input.cpfCnpj),
      p_legal_name: input.documentType === 'CNPJ' ? input.legalName.trim() : null,
      p_trade_name: input.documentType === 'CNPJ' ? input.tradeName.trim() : null,
      p_cep:
        input.documentType === 'CNPJ' ? onlyDigits(input.companyAddress.cep) : null,
      p_street: input.documentType === 'CNPJ' ? input.companyAddress.street.trim() : null,
      p_number: input.documentType === 'CNPJ' ? input.companyAddress.number.trim() : null,
      p_district:
        input.documentType === 'CNPJ' ? input.companyAddress.district.trim() : null,
      p_company_city:
        input.documentType === 'CNPJ' ? input.companyAddress.city.trim() : null,
    });
    if (error) throw new Error(error.message);
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const email = userData.user?.email;
    if (!email) throw new Error('Sessão expirada. Entre novamente.');

    const { error: verificationError } = await client.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verificationError) throw new Error('A senha atual está incorreta.');

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },

  async deleteMyAccount() {
    const client = requireSupabase();
    const { error } = await client.rpc('delete_my_account');
    if (error) throw new Error(error.message);
  },
};
