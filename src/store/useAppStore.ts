import { itemTotals, validateCatalogItem } from '@/utils/catalog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  demoAppointments,
  demoCancellationRecords,
  demoCommunityMessages,
  demoProviders,
  demoReviews,
  demoServiceQuotes,
  demoServiceRequests,
} from '@/data/mock';
import { inferServiceCategories } from '@/data/serviceCategories';
import {
  getPlanCityLimit,
  getProviderWithRefreshedCycle,
  hasReachedMonthlyServiceLimit,
} from '@/data/subscriptionPlans';
import { defaultValeCity, isValeCity, type ValeCity } from '@/data/valeCities';
import { isProviderAvailableAt } from '@/utils/availability';
import type {
  AppUser,
  CatalogItem,
  AppointmentItem,
  Appointment,
  AppointmentStatus,
  CancellationReason,
  CancellationRecord,
  CommunityMessage,
  CreateAppointmentInput,
  CreateServiceQuoteInput,
  CreateServiceRequestInput,
  PaymentMethod,
  ProviderProfile,
  ProviderRegistrationData,
  Review,
  ServiceQuote,
  ServiceRequest,
  SubscriptionPlan,
  UserRole,
} from '@/types';

type ProviderProfileUpdate = Pick<
  ProviderProfile,
  | 'fullName'
  | 'profession'
  | 'bio'
  | 'serviceCategories'
  | 'availability'
  | 'serviceCities'
>;

type LocalRegistrationData = {
  cpf?: string;
  provider?: ProviderRegistrationData;
};

type AppState = {
  hasHydrated: boolean;
  currentUser: AppUser | null;
  selectedServiceCity: ValeCity;
  providers: ProviderProfile[];
  appointments: Appointment[];
  catalogItems: CatalogItem[];
  saveCatalogItem: (input: Omit<CatalogItem, 'id' | 'providerId'>, id?: string) => void;
  removeCatalogItem: (id: string) => void;
  reviews: Review[];
  cancellationRecords: CancellationRecord[];
  serviceRequests: ServiceRequest[];
  serviceQuotes: ServiceQuote[];
  communityMessages: CommunityMessage[];
  seenServiceRequestKeys: string[];
  favoriteProviderIds: string[];
  setHasHydrated: (value: boolean) => void;
  setSelectedServiceCity: (city: ValeCity) => void;
  updateCurrentUser: (input: {
    fullName: string;
    email: string;
    phone: string;
    city: ValeCity;
    cpf: string;
  }) => void;
  updateProviderRegistration: (input: ProviderRegistrationData) => void;
  loginAs: (
    role: UserRole,
    fullName?: string,
    email?: string,
    registration?: LocalRegistrationData,
  ) => void;
  logout: () => void;
  createAppointment: (input: CreateAppointmentInput) => Appointment | null;
  setAppointmentStatus: (
    appointmentId: string,
    status: Exclude<AppointmentStatus, 'completed'>,
    rejectionReason?: string,
  ) => void;
  acceptAppointment: (appointmentId: string) => 'accepted' | 'limit_reached' | 'invalid';
  completeAppointment: (
    appointmentId: string,
    finalAmount: number,
    paymentMethod: PaymentMethod,
    items?: AppointmentItem[],
  ) => boolean;
  cancelAppointment: (
    appointmentId: string,
    reason: CancellationReason,
    justification?: string,
  ) => boolean;
  replyToCancellation: (cancellationId: string, reply: string) => boolean;
  reportHistoryItem: (kind: 'review' | 'cancellation', id: string) => boolean;
  setAgendaOpen: (open: boolean) => void;
  setProviderProfileHidden: (hidden: boolean) => void;
  updateProviderProfile: (update: ProviderProfileUpdate) => void;
  changeProviderPlan: (plan: SubscriptionPlan) => boolean;
  refreshProviderUsageCycle: () => void;
  addPortfolioItem: (imageUrl: string, caption?: string) => void;
  createServiceRequest: (input: CreateServiceRequestInput) => ServiceRequest | null;
  submitServiceQuote: (input: CreateServiceQuoteInput) => ServiceQuote | null;
  sendCommunityMessage: (quoteId: string, body: string) => CommunityMessage | null;
  receiveCommunityMessage: (message: CommunityMessage) => void;
  selectServiceQuote: (requestId: string, quoteId: string) => boolean;
  cancelServiceRequest: (requestId: string) => void;
  markServiceRequestSeen: (requestId: string) => void;
  toggleFavoriteProvider: (providerId: string) => void;
  submitReview: (
    appointmentId: string,
    reviewerRole: UserRole,
    rating: number,
    comment?: string,
  ) => void;
  resetDemoData: () => void;
};

const demoUsers: Record<UserRole, AppUser> = {
  client: {
    id: 'client-1',
    role: 'client',
    fullName: 'João Silva',
    email: 'cliente@demo.com',
    phone: '(13) 99999-0001',
    city: defaultValeCity,
    cpf: '52998224725',
  },
  provider: {
    id: 'provider-1',
    role: 'provider',
    fullName: 'Marina Oliveira',
    email: 'prestador@demo.com',
    phone: '(13) 99999-0002',
    city: defaultValeCity,
    avatarUrl: demoProviders[0].avatarUrl,
    documentType: 'CPF',
    cpfCnpj: '11144477735',
    responsibleName: 'Marina Oliveira',
  },
};

function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      catalogItems: [],
      saveCatalogItem: (input, id) => {
        validateCatalogItem(input);
        const user = get().currentUser;
        if (!user || user.role !== 'provider') throw new Error('Prestador não autenticado.');
        const item = { ...input, costPrice: input.kind === 'product' ? input.costPrice : 0,
          id: id ?? createLocalId('catalog'), providerId: user.id };
        set((state) => ({ catalogItems: [item, ...state.catalogItems.filter((entry) => entry.id !== item.id)] }));
      },
      removeCatalogItem: (id) => set((state) => ({ catalogItems: state.catalogItems.filter(
        (item) => item.id !== id || item.providerId !== state.currentUser?.id) })),
      hasHydrated: false,
      currentUser: null,
      selectedServiceCity: defaultValeCity,
      providers: demoProviders,
      appointments: demoAppointments,
      reviews: demoReviews,
      cancellationRecords: demoCancellationRecords,
      serviceRequests: demoServiceRequests,
      serviceQuotes: demoServiceQuotes,
      communityMessages: demoCommunityMessages,
      seenServiceRequestKeys: [],
      favoriteProviderIds: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSelectedServiceCity: (city) => set({ selectedServiceCity: city }),
      updateCurrentUser: (input) =>
        set((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                fullName: input.fullName.trim(),
                email: input.email.trim().toLowerCase(),
                phone: input.phone,
                city: input.city,
                cpf: input.cpf,
              }
            : null,
          selectedServiceCity:
            state.currentUser?.role === 'client' ? input.city : state.selectedServiceCity,
          providers:
            state.currentUser?.role === 'provider'
              ? state.providers.map((provider) =>
                  provider.id === state.currentUser?.id
                    ? { ...provider, fullName: input.fullName.trim(), city: input.city }
                    : provider,
                )
              : state.providers,
        })),
      updateProviderRegistration: (input) => {
        const publicName =
          input.documentType === 'CNPJ' ? input.tradeName.trim() : input.responsibleName.trim();
        set((state) => ({
          currentUser:
            state.currentUser?.role === 'provider'
              ? {
                  ...state.currentUser,
                  fullName: publicName,
                  email: input.email.trim().toLowerCase(),
                  phone: input.phone,
                  documentType: input.documentType,
                  cpfCnpj: input.cpfCnpj,
                  responsibleName: input.responsibleName.trim(),
                  legalName: input.legalName.trim() || undefined,
                  tradeName: input.tradeName.trim() || undefined,
                }
              : state.currentUser,
          providers: state.providers.map((provider) =>
            provider.id === state.currentUser?.id
              ? {
                  ...provider,
                  fullName: publicName,
                  documentType: input.documentType,
                  cpfCnpj: input.cpfCnpj,
                  responsibleName: input.responsibleName.trim(),
                  legalName: input.legalName.trim() || undefined,
                  tradeName: input.tradeName.trim() || undefined,
                  companyAddress:
                    input.documentType === 'CNPJ' ? input.companyAddress : undefined,
                }
              : provider,
          ),
        }));
      },
      loginAs: (role, fullName, email, registration) => {
        const demoUser = demoUsers[role];
        const providerRegistration = registration?.provider;
        set((state) => ({
          currentUser: {
            ...demoUser,
            fullName: fullName?.trim() || demoUser.fullName,
            email: email?.trim() || demoUser.email,
            cpf: registration?.cpf ?? demoUser.cpf,
            ...(providerRegistration
              ? {
                  documentType: providerRegistration.documentType,
                  cpfCnpj: providerRegistration.cpfCnpj,
                  responsibleName: providerRegistration.responsibleName,
                  legalName: providerRegistration.legalName || undefined,
                  tradeName: providerRegistration.tradeName || undefined,
                }
              : {}),
          },
          providers:
            role === 'provider' && providerRegistration
              ? state.providers.map((provider) =>
                  provider.id === demoUser.id
                    ? {
                        ...provider,
                        fullName: fullName?.trim() || provider.fullName,
                        documentType: providerRegistration.documentType,
                        cpfCnpj: providerRegistration.cpfCnpj,
                        responsibleName: providerRegistration.responsibleName,
                        legalName: providerRegistration.legalName || undefined,
                        tradeName: providerRegistration.tradeName || undefined,
                        companyAddress:
                          providerRegistration.documentType === 'CNPJ'
                            ? providerRegistration.companyAddress
                            : undefined,
                      }
                    : provider,
                )
              : state.providers,
        }));
      },
      logout: () => set({ currentUser: null }),
      createAppointment: (input) => {
        const { currentUser, providers, appointments } = get();
        if (!currentUser || currentUser.role !== 'client') return null;

        const provider = providers.find((item) => item.id === input.providerId);
        const scheduledAt = new Date(input.scheduledAt);
        if (!provider || !isProviderAvailableAt(provider, scheduledAt)) return null;

        const appointment: Appointment = {
          id: `appointment-${Date.now()}`,
          clientId: currentUser.id,
          clientName: currentUser.fullName,
          providerId: provider.id,
          providerName: provider.fullName,
          service: provider.profession,
          scheduledAt: input.scheduledAt,
          details: input.details.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
          clientReviewed: false,
          providerReviewed: false,
        };

        set({ appointments: [appointment, ...appointments] });
        return appointment;
      },
      setAppointmentStatus: (appointmentId, status, rejectionReason) =>
        status === 'accepted'
          ? void get().acceptAppointment(appointmentId)
          : set((state) => ({
              appointments: state.appointments.map((appointment) =>
                appointment.id === appointmentId
                  ? {
                      ...appointment,
                      status,
                      rejectionReason:
                        status === 'declined' ? rejectionReason?.trim() : undefined,
                    }
                  : appointment,
              ),
            })),
      acceptAppointment: (appointmentId) => {
        const { currentUser, appointments, providers } = get();
        const appointment = appointments.find((item) => item.id === appointmentId);
        const provider = providers.find((item) => item.id === currentUser?.id);
        if (
          !currentUser ||
          currentUser.role !== 'provider' ||
          !appointment ||
          appointment.providerId !== currentUser.id ||
          appointment.status !== 'pending' ||
          !provider
        ) {
          return 'invalid';
        }

        const refreshedProvider = getProviderWithRefreshedCycle(provider);
        if (hasReachedMonthlyServiceLimit(refreshedProvider)) return 'limit_reached';

        set({
          providers: providers.map((item) =>
            item.id === provider.id
              ? { ...refreshedProvider, currentMonthServices: refreshedProvider.currentMonthServices + 1 }
              : item,
          ),
          appointments: appointments.map((item) =>
            item.id === appointmentId ? { ...item, status: 'accepted' } : item,
          ),
        });
        return 'accepted';
      },
      completeAppointment: (appointmentId, finalAmount, paymentMethod, items = []) => {
        const { currentUser, appointments } = get();
        const appointment = appointments.find((item) => item.id === appointmentId);
        if (
          !currentUser ||
          currentUser.role !== 'provider' ||
          !appointment ||
          appointment.providerId !== currentUser.id ||
          appointment.status !== 'accepted' ||
          !Number.isFinite(finalAmount) ||
          finalAmount <= 0
        ) {
          return false;
        }

        set({
          appointments: appointments.map((item) =>
            item.id === appointmentId
              ? {
                  ...item,
                  status: 'completed',
                  finalAmount: Number(finalAmount.toFixed(2)),
                  items: items.map((item) => ({ ...item })),
                  totalCost: itemTotals(items).cost,
                  paymentMethod,
                  completedAt: new Date().toISOString(),
                }
              : item,
          ),
        });
        return true;
      },
      cancelAppointment: (appointmentId, reason, justification) => {
        const { currentUser, appointments, cancellationRecords } = get();
        const appointment = appointments.find((item) => item.id === appointmentId);
        const isParticipant =
          currentUser?.id === appointment?.clientId || currentUser?.id === appointment?.providerId;
        if (
          !currentUser ||
          !appointment ||
          !isParticipant ||
          appointment.status !== 'accepted' ||
          cancellationRecords.some((item) => item.appointmentId === appointmentId) ||
          (justification?.trim().length ?? 0) > 140
        ) {
          return false;
        }

        const cancellation: CancellationRecord = {
          id: createLocalId('cancellation'),
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          clientName: appointment.clientName,
          providerId: appointment.providerId,
          providerName: appointment.providerName,
          service: appointment.service,
          cancelledBy: currentUser.role,
          reason,
          justification: justification?.trim() || undefined,
          moderationStatus: 'publicado',
          createdAt: new Date().toISOString(),
        };
        set({
          appointments: appointments.map((item) =>
            item.id === appointmentId ? { ...item, status: 'cancelled' } : item,
          ),
          cancellationRecords: [cancellation, ...cancellationRecords],
        });
        return true;
      },
      replyToCancellation: (cancellationId, reply) => {
        const { currentUser, cancellationRecords } = get();
        const record = cancellationRecords.find((item) => item.id === cancellationId);
        const trimmedReply = reply.trim();
        const recipientId =
          record?.cancelledBy === 'client' ? record.providerId : record?.clientId;
        if (
          !currentUser ||
          !record ||
          currentUser.id !== recipientId ||
          record.reply ||
          trimmedReply.length < 1 ||
          trimmedReply.length > 140
        ) {
          return false;
        }
        set({
          cancellationRecords: cancellationRecords.map((item) =>
            item.id === cancellationId
              ? {
                  ...item,
                  reply: trimmedReply,
                  repliedBy: currentUser.id,
                  repliedAt: new Date().toISOString(),
                }
              : item,
          ),
        });
        return true;
      },
      reportHistoryItem: (kind, id) => {
        const { currentUser, reviews, cancellationRecords } = get();
        if (!currentUser) return false;
        if (kind === 'review') {
          const review = reviews.find((item) => item.id === id);
          if (
            !review ||
            review.reviewedId !== currentUser.id ||
            review.moderationStatus === 'sob_analise'
          ) {
            return false;
          }
          set({
            reviews: reviews.map((item) =>
              item.id === id
                ? { ...item, moderationStatus: 'sob_analise', reportedBy: currentUser.id }
                : item,
            ),
          });
          return true;
        }

        const cancellation = cancellationRecords.find((item) => item.id === id);
        const recipientId =
          cancellation?.cancelledBy === 'client'
            ? cancellation.providerId
            : cancellation?.clientId;
        if (
          !cancellation ||
          recipientId !== currentUser.id ||
          cancellation.moderationStatus === 'sob_analise'
        ) {
          return false;
        }
        set({
          cancellationRecords: cancellationRecords.map((item) =>
            item.id === id
              ? {
                  ...item,
                  moderationStatus: 'sob_analise',
                  reportedBy: currentUser.id,
                }
              : item,
          ),
        });
        return true;
      },
      setAgendaOpen: (open) =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === state.currentUser?.id
              ? { ...provider, agendaOpen: open }
              : provider,
          ),
        })),
      setProviderProfileHidden: (hidden) =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === state.currentUser?.id
              ? { ...provider, profileHidden: hidden }
              : provider,
          ),
        })),
      updateProviderProfile: (update) =>
        set((state) => ({
          providers: state.providers.map((provider) => {
            if (provider.id !== state.currentUser?.id) return provider;
            const cityLimit = getPlanCityLimit(provider.currentPlan);
            return {
              ...provider,
              ...update,
              serviceCities:
                cityLimit === null ? update.serviceCities : update.serviceCities.slice(0, cityLimit),
            };
          }),
          currentUser:
            state.currentUser?.role === 'provider'
              ? { ...state.currentUser, fullName: update.fullName }
              : state.currentUser,
        })),
      changeProviderPlan: (plan) => {
        const { currentUser, providers } = get();
        const provider = providers.find((item) => item.id === currentUser?.id);
        if (!provider || currentUser?.role !== 'provider') return false;
        const cityLimit = getPlanCityLimit(plan);
        set({
          providers: providers.map((item) =>
            item.id === provider.id
              ? {
                  ...getProviderWithRefreshedCycle(item),
                  currentPlan: plan,
                  serviceCities:
                    cityLimit === null ? item.serviceCities : item.serviceCities.slice(0, cityLimit),
                }
              : item,
          ),
        });
        return true;
      },
      refreshProviderUsageCycle: () =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === state.currentUser?.id
              ? getProviderWithRefreshedCycle(provider)
              : provider,
          ),
        })),
      addPortfolioItem: (imageUrl, caption) =>
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === state.currentUser?.id && provider.portfolio.length < 8
              ? {
                  ...provider,
                  portfolio: [
                    ...provider.portfolio,
                    {
                      id: `portfolio-${Date.now()}`,
                      imageUrl,
                      caption: caption?.trim() || 'Trabalho realizado',
                    },
                  ],
                }
              : provider,
          ),
        })),
      createServiceRequest: (input) => {
        const { currentUser, selectedServiceCity, serviceRequests } = get();
        if (!currentUser || currentUser.role !== 'client') return null;

        const request: ServiceRequest = {
          id: createLocalId('request'),
          clientId: currentUser.id,
          clientName: currentUser.fullName,
          category: input.category,
          title: input.title.trim(),
          description: input.description.trim(),
          city: selectedServiceCity,
          urgency: input.urgency,
          media: input.media,
          status: 'open',
          createdAt: new Date().toISOString(),
        };

        set({ serviceRequests: [request, ...serviceRequests] });
        return request;
      },
      submitServiceQuote: (input) => {
        const { currentUser, providers, serviceQuotes, serviceRequests } = get();
        if (!currentUser || currentUser.role !== 'provider') return null;

        const provider = providers.find((item) => item.id === currentUser.id);
        const request = serviceRequests.find((item) => item.id === input.requestId);
        if (
          !provider ||
          !provider.agendaOpen ||
          provider.profileHidden ||
          !request ||
          request.status !== 'open' ||
          !provider.serviceCities.some((city) => city === request.city)
        ) {
          return null;
        }

        const existing = serviceQuotes.find(
          (quote) => quote.requestId === request.id && quote.providerId === provider.id,
        );
        const refreshedProvider = getProviderWithRefreshedCycle(provider);
        if (!existing && hasReachedMonthlyServiceLimit(refreshedProvider)) return null;
        const quote: ServiceQuote = {
          id: existing?.id ?? createLocalId('quote'),
          requestId: request.id,
          providerId: provider.id,
          providerName: provider.fullName,
          amount: input.amount,
          estimatedDuration: input.estimatedDuration.trim(),
          message: input.message.trim(),
          includesMaterials: input.includesMaterials,
          materialsDescription: input.materialsDescription?.trim() || undefined,
          status: 'sent',
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        };

        set({
          providers: existing
            ? providers
            : providers.map((item) =>
                item.id === provider.id
                  ? {
                      ...refreshedProvider,
                      currentMonthServices: refreshedProvider.currentMonthServices + 1,
                    }
                  : item,
              ),
          serviceQuotes: existing
            ? serviceQuotes.map((item) => (item.id === existing.id ? quote : item))
            : [quote, ...serviceQuotes],
        });
        return quote;
      },
      sendCommunityMessage: (quoteId, body) => {
        const { currentUser, serviceQuotes, serviceRequests, communityMessages } = get();
        const trimmedBody = body.trim();
        const quote = serviceQuotes.find((item) => item.id === quoteId);
        const request = serviceRequests.find((item) => item.id === quote?.requestId);
        if (
          !currentUser ||
          !quote ||
          !request ||
          trimmedBody.length < 1 ||
          trimmedBody.length > 1000 ||
          (currentUser.id !== request.clientId && currentUser.id !== quote.providerId)
        ) {
          return null;
        }

        const message: CommunityMessage = {
          id: createLocalId('message'),
          requestId: request.id,
          quoteId: quote.id,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          body: trimmedBody,
          createdAt: new Date().toISOString(),
        };
        set({ communityMessages: [...communityMessages, message] });
        return message;
      },
      receiveCommunityMessage: (message) =>
        set((state) =>
          state.communityMessages.some((item) => item.id === message.id)
            ? state
            : { communityMessages: [...state.communityMessages, message] },
        ),
      selectServiceQuote: (requestId, quoteId) => {
        const { currentUser, serviceQuotes, serviceRequests } = get();
        const request = serviceRequests.find((item) => item.id === requestId);
        const quote = serviceQuotes.find(
          (item) => item.id === quoteId && item.requestId === requestId,
        );
        if (
          !currentUser ||
          currentUser.role !== 'client' ||
          !request ||
          request.clientId !== currentUser.id ||
          request.status !== 'open' ||
          !quote
        ) {
          return false;
        }

        set({
          serviceRequests: serviceRequests.map((item) =>
            item.id === requestId
              ? {
                  ...item,
                  status: 'quote_selected',
                  selectedQuoteId: quote.id,
                  selectedProviderId: quote.providerId,
                }
              : item,
          ),
          serviceQuotes: serviceQuotes.map((item) =>
            item.requestId === requestId
              ? { ...item, status: item.id === quoteId ? 'selected' : 'rejected' }
              : item,
          ),
        });
        return true;
      },
      cancelServiceRequest: (requestId) =>
        set((state) => ({
          serviceRequests: state.serviceRequests.map((request) =>
            request.id === requestId &&
            request.clientId === state.currentUser?.id &&
            request.status === 'open'
              ? { ...request, status: 'cancelled' }
              : request,
          ),
        })),
      markServiceRequestSeen: (requestId) =>
        set((state) => {
          if (state.currentUser?.role !== 'provider') return state;
          const key = `${state.currentUser.id}:${requestId}`;
          return state.seenServiceRequestKeys.includes(key)
            ? state
            : { seenServiceRequestKeys: [...state.seenServiceRequestKeys, key] };
        }),
      toggleFavoriteProvider: (providerId) =>
        set((state) => ({
          favoriteProviderIds: state.favoriteProviderIds.includes(providerId)
            ? state.favoriteProviderIds.filter((id) => id !== providerId)
            : [...state.favoriteProviderIds, providerId],
        })),
      submitReview: (appointmentId, reviewerRole, rating, comment) => {
        const { appointments, currentUser } = get();
        const appointment = appointments.find((item) => item.id === appointmentId);
        if (!appointment || !currentUser || appointment.status !== 'completed') return;

        const reviewedId =
          reviewerRole === 'client' ? appointment.providerId : appointment.clientId;
        const review: Review = {
          id: `review-${Date.now()}`,
          appointmentId,
          reviewerId: currentUser.id,
          reviewedId,
          reviewerRole,
          rating,
          comment: comment?.trim() || undefined,
          moderationStatus: 'publicado',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          reviews: [review, ...state.reviews],
          appointments: state.appointments.map((item) =>
            item.id === appointmentId
              ? {
                  ...item,
                  clientReviewed:
                    reviewerRole === 'client' ? true : item.clientReviewed,
                  providerReviewed:
                    reviewerRole === 'provider' ? true : item.providerReviewed,
                }
              : item,
          ),
          providers:
            reviewerRole === 'client'
              ? state.providers.map((provider) => {
                  if (provider.id !== appointment.providerId) return provider;
                  const nextCount = provider.reviewCount + 1;
                  const nextRating =
                    (provider.rating * provider.reviewCount + rating) / nextCount;
                  return {
                    ...provider,
                    rating: Number(nextRating.toFixed(1)),
                    reviewCount: nextCount,
                  };
                })
              : state.providers,
        }));
      },
      resetDemoData: () =>
        set({
          catalogItems: [],
          currentUser: null,
          selectedServiceCity: defaultValeCity,
          providers: demoProviders,
          appointments: demoAppointments,
          reviews: demoReviews,
          cancellationRecords: demoCancellationRecords,
          serviceRequests: demoServiceRequests,
          serviceQuotes: demoServiceQuotes,
          communityMessages: demoCommunityMessages,
          seenServiceRequestKeys: [],
          favoriteProviderIds: [],
        }),
    }),
    {
      name: 'conectaserv-mvp',
      version: 9,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<AppState>;
        const persistedUser = persisted.currentUser;
        const matchingDemoUser = persistedUser ? demoUsers[persistedUser.role] : null;
        const migratedProviders: ProviderProfile[] = Array.isArray(persisted.providers)
          ? persisted.providers.map((provider) => {
              const demoProvider = demoProviders.find((item) => item.id === provider.id);
              const currentPlan =
                provider.currentPlan ?? demoProvider?.currentPlan ?? 'gratuito';
              return {
              ...provider,
              documentType: provider.documentType ?? demoProvider?.documentType,
              cpfCnpj: provider.cpfCnpj ?? demoProvider?.cpfCnpj,
              responsibleName: provider.responsibleName ?? demoProvider?.responsibleName,
              serviceCategories: provider.serviceCategories?.length
                ? provider.serviceCategories
                : inferServiceCategories(provider.profession),
              availability: provider.availability ?? {
                weekdays: [1, 2, 3, 4, 5],
                startTime: '08:00',
                endTime: '18:00',
              },
              profileHidden: provider.profileHidden ?? false,
              currentPlan,
              currentMonthServices: provider.currentMonthServices ?? 0,
              lastUsageResetAt: provider.lastUsageResetAt ?? new Date().toISOString(),
              serviceCities: provider.serviceCities?.filter(isValeCity).length
                ? provider.serviceCities
                    .filter(isValeCity)
                    .slice(0, getPlanCityLimit(currentPlan) ?? undefined)
                : [defaultValeCity],
              };
            })
          : [];

        for (const demoProvider of demoProviders) {
          if (!migratedProviders.some((provider) => provider.id === demoProvider.id)) {
            migratedProviders.push(demoProvider);
          }
        }

        return {
          ...persisted,
          currentUser:
            persistedUser && matchingDemoUser && persistedUser.id === matchingDemoUser.id
              ? { ...matchingDemoUser, ...persistedUser }
              : persistedUser ?? null,
          selectedServiceCity: isValeCity(persisted.selectedServiceCity)
            ? persisted.selectedServiceCity
            : defaultValeCity,
          providers: migratedProviders,
          reviews: Array.isArray(persisted.reviews)
            ? persisted.reviews.map((review) => ({
                ...review,
                moderationStatus: review.moderationStatus ?? 'publicado',
              }))
            : demoReviews,
          cancellationRecords: Array.isArray(persisted.cancellationRecords)
            ? persisted.cancellationRecords
            : demoCancellationRecords,
          communityMessages: Array.isArray(persisted.communityMessages)
            ? persisted.communityMessages
            : demoCommunityMessages,
        };
      },
      partialize: (state) => ({
        currentUser: state.currentUser,
        selectedServiceCity: state.selectedServiceCity,
        providers: state.providers,
        appointments: state.appointments,
        reviews: state.reviews,
        cancellationRecords: state.cancellationRecords,
        serviceRequests: state.serviceRequests,
        serviceQuotes: state.serviceQuotes,
        communityMessages: state.communityMessages,
        seenServiceRequestKeys: state.seenServiceRequestKeys,
        favoriteProviderIds: state.favoriteProviderIds,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
