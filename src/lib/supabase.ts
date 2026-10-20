import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type EmailOtpType, type Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

export const AUTH_EMAIL_REDIRECT_URL = 'conectaserv://--/confirm-email';

export type AuthDeepLinkResult =
  | { status: 'success'; session: Session; role?: 'client' | 'provider' }
  | { status: 'error'; message: string }
  | { status: 'ignored' };

type AuthDeepLinkListener = (result: AuthDeepLinkResult) => void;

const authDeepLinkListeners = new Set<AuthDeepLinkListener>();
let latestAuthDeepLinkResult: AuthDeepLinkResult | null = null;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const webStorage = {
  async getItem(key: string) {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    !supabaseUrl.includes('seu-projeto') &&
    !supabasePublishableKey.includes('sua-chave'),
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase ainda não configurado. Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.',
    );
  }
  return supabase;
}

function notifyAuthDeepLinkListeners(result: AuthDeepLinkResult) {
  latestAuthDeepLinkResult = result;
  authDeepLinkListeners.forEach((listener) => listener(result));
}

function getAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return { parsedUrl, params };
}

function isConfirmationUrl(parsedUrl: URL) {
  return (
    parsedUrl.protocol === 'conectaserv:' &&
    parsedUrl.pathname.replace(/\/$/, '').endsWith('/confirm-email')
  );
}

function getUserRole(session: Session): 'client' | 'provider' | undefined {
  const role = session.user.user_metadata?.role;
  return role === 'client' || role === 'provider' ? role : undefined;
}

/**
 * Converte o retorno do e-mail de autenticação em uma sessão persistida.
 * Suporta tanto PKCE (`code`) quanto o fluxo implícito (`access_token`).
 */
export async function handleSupabaseAuthUrl(url: string): Promise<AuthDeepLinkResult> {
  if (!supabase) {
    return { status: 'error', message: 'A conexão com o Supabase não está configurada.' };
  }

  try {
    const { parsedUrl, params } = getAuthParams(url);
    if (!isConfirmationUrl(parsedUrl)) return { status: 'ignored' };

    const authError = params.get('error_description') ?? params.get('error');
    if (authError) {
      return { status: 'error', message: authError.replace(/\+/g, ' ') };
    }

    const code = params.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data.session) throw new Error('A confirmação não criou uma sessão válida.');
      return { status: 'success', session: data.session, role: getUserRole(data.session) };
    }

    const tokenHash = params.get('token_hash');
    const otpType = params.get('type');
    if (tokenHash && otpType) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as EmailOtpType,
      });
      if (error) throw error;
      if (!data.session) throw new Error('A confirmação não criou uma sessão válida.');
      return { status: 'success', session: data.session, role: getUserRole(data.session) };
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      if (!data.session) throw new Error('A confirmação não criou uma sessão válida.');
      return { status: 'success', session: data.session, role: getUserRole(data.session) };
    }

    const { data } = await supabase.auth.getSession();
    if (data.session?.user.email_confirmed_at) {
      return {
        status: 'success',
        session: data.session,
        role: getUserRole(data.session),
      };
    }

    return {
      status: 'error',
      message: 'O link de confirmação é inválido, já foi usado ou expirou.',
    };
  } catch (error) {
    return {
      status: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o e-mail. Solicite um novo link.',
    };
  }
}

export function subscribeToAuthDeepLinks(listener: AuthDeepLinkListener) {
  authDeepLinkListeners.add(listener);
  if (latestAuthDeepLinkResult) listener(latestAuthDeepLinkResult);
  return () => authDeepLinkListeners.delete(listener);
}

export function startSupabaseAuthDeepLinkListener() {
  const processUrl = async (url: string | null) => {
    if (!url) return;
    const result = await handleSupabaseAuthUrl(url);
    if (result.status !== 'ignored') notifyAuthDeepLinkListeners(result);
  };

  void Linking.getInitialURL().then(processUrl);
  const subscription = Linking.addEventListener('url', ({ url }) => {
    void processUrl(url);
  });

  return () => subscription.remove();
}
