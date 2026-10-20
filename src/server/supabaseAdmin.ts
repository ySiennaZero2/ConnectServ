import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

function requireServerEnv(name: string, fallbackName?: string) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);
  if (
    !value?.trim() ||
    value.includes('seu-projeto') ||
    value.includes('sua-chave')
  ) {
    throw new Error(`Variavel de servidor ${name} nao configurada.`);
  }
  return value.trim();
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = requireServerEnv('SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_URL');
  const secret = requireServerEnv('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  adminClient = createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}

export async function authenticateProviderRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new ApiAuthError('Sessao ausente. Entre novamente.', 401);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ApiAuthError('Sessao invalida ou expirada.', 401);

  const { data: rawProfile, error: profileError } = await admin
    .from('profiles')
    .select('id, role, full_name, cpf')
    .eq('id', data.user.id)
    .single();
  const profile = rawProfile as unknown as {
    id: string;
    role: 'client' | 'provider';
    full_name: string;
    cpf: string | null;
  } | null;
  if (profileError || profile?.role !== 'provider') {
    throw new ApiAuthError('Apenas prestadores podem gerenciar assinaturas.', 403);
  }

  return { admin, user: data.user, profile };
}

export class ApiAuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
