import { requireSupabase } from '@/lib/supabase';
import type { ServiceCategory, WeeklyAvailability } from '@/types';
import type { ValeCity } from '@/data/valeCities';

export const providersService = {
  async list(search?: string) {
    const client = requireSupabase();
    let query = client
      .from('provider_profiles')
      .select(
        'user_id, profession, bio, agenda_open, profile_hidden, availability_weekdays, availability_start, availability_end, availability_timezone, service_cities, service_categories, service_radius_km, rating_average, rating_count, plano_atual, atendimentos_mes_atual, data_ultimo_reset, tipo_documento, nome_fantasia, cep, logradouro, numero, bairro, cidade_fisica, fachada_url, created_at, updated_at, profile:profiles!provider_profiles_user_id_fkey(full_name, avatar_url, city), portfolio_items(*)',
      )
      .eq('profile_hidden', false)
      .order('plano_atual', { ascending: false })
      .order('rating_average', { ascending: false });

    if (search?.trim()) {
      query = query.ilike('profession', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  async updateMyProfile(input: {
    profession: string;
    bio: string;
    agendaOpen?: boolean;
    serviceCategories?: ServiceCategory[];
    availability?: WeeklyAvailability;
    serviceCities?: ValeCity[];
    profileHidden?: boolean;
  }) {
    const client = requireSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sessão expirada. Entre novamente.');

    const { data, error } = await client
      .from('provider_profiles')
      .update({
        profession: input.profession,
        bio: input.bio,
        ...(typeof input.agendaOpen === 'boolean'
          ? { agenda_open: input.agendaOpen }
          : {}),
        ...(input.serviceCategories?.length
          ? { service_categories: input.serviceCategories }
          : {}),
        ...(input.availability
          ? {
              availability_weekdays: input.availability.weekdays,
              availability_start: input.availability.startTime,
              availability_end: input.availability.endTime,
            }
          : {}),
        ...(input.serviceCities?.length ? { service_cities: input.serviceCities } : {}),
        ...(typeof input.profileHidden === 'boolean'
          ? { profile_hidden: input.profileHidden }
          : {}),
      })
      .eq('user_id', userId)
      .select(
        'user_id, profession, bio, agenda_open, profile_hidden, availability_weekdays, availability_start, availability_end, availability_timezone, service_cities, service_categories, service_radius_km, rating_average, rating_count, plano_atual, atendimentos_mes_atual, data_ultimo_reset, created_at, updated_at',
      )
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async setProfileHidden(hidden: boolean) {
    const client = requireSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sessão expirada. Entre novamente.');

    const { error } = await client
      .from('provider_profiles')
      .update({ profile_hidden: hidden })
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  async refreshMyPlanCycle() {
    const client = requireSupabase();
    const { data, error } = await client.rpc('refresh_my_provider_plan');
    if (error) throw new Error(error.message);
    return data;
  },

};
