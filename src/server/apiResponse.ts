import { ApiAuthError } from '@/server/supabaseAdmin';

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function apiError(error: unknown, context: string) {
  const status = error instanceof ApiAuthError ? error.status : 500;
  const message = error instanceof Error ? error.message : 'Erro interno inesperado.';
  console.error(JSON.stringify({ level: 'error', context, message, timestamp: new Date().toISOString() }));
  return json({ error: status >= 500 ? 'Nao foi possivel concluir a operacao.' : message }, status);
}
