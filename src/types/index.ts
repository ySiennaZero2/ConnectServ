import type { ValeCity } from '@/data/valeCities';

export type UserRole = 'client' | 'provider';
export type FiscalDocumentType = 'CPF' | 'CNPJ';
export type SubscriptionPlan = 'gratuito' | 'profissional' | 'premium';

export type ServiceCategory =
  | 'electrical'
  | 'plumbing'
  | 'cleaning'
  | 'furniture'
  | 'painting'
  | 'air_conditioning'
  | 'general';

export type ServiceRequestStatus = 'open' | 'quote_selected' | 'cancelled' | 'closed';

export type QuoteStatus = 'sent' | 'selected' | 'rejected';

export type RequestUrgency = 'flexible' | 'soon' | 'urgent';

export type AppointmentStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'completed'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'cash';
export type CancellationReason =
  | 'communication_failure'
  | 'service_disagreement'
  | 'lateness'
  | 'other';
export type ModerationStatus = 'publicado' | 'sob_analise';

export type AppUser = {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  city: string;
  avatarUrl?: string;
  cpf?: string;
  documentType?: FiscalDocumentType;
  cpfCnpj?: string;
  legalName?: string;
  tradeName?: string;
  responsibleName?: string;
};

export type PortfolioItem = {
  id: string;
  imageUrl: string;
  caption: string;
};

export type WeeklyAvailability = {
  weekdays: number[];
  startTime: string;
  endTime: string;
};

export type ProviderProfile = {
  id: string;
  userId: string;
  fullName: string;
  profession: string;
  bio: string;
  city: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  agendaOpen: boolean;
  profileHidden: boolean;
  availability: WeeklyAvailability;
  serviceCities: ValeCity[];
  serviceCategories: ServiceCategory[];
  avatarUrl: string;
  portfolio: PortfolioItem[];
  storefrontImageUrl?: string;
  currentPlan: SubscriptionPlan;
  currentMonthServices: number;
  lastUsageResetAt: string;
  documentType?: FiscalDocumentType;
  cpfCnpj?: string;
  legalName?: string;
  tradeName?: string;
  responsibleName?: string;
  companyAddress?: {
    cep: string;
    street: string;
    number: string;
    district: string;
    city: string;
  };
};

export type ClientRegistrationData = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  cpf: string;
};

export type ProviderRegistrationData = {
  responsibleName: string;
  email: string;
  phone: string;
  documentType: FiscalDocumentType;
  cpfCnpj: string;
  legalName: string;
  tradeName: string;
  companyAddress: {
    cep: string;
    street: string;
    number: string;
    district: string;
    city: string;
  };
};

export type RequestMedia = {
  id: string;
  type: 'image' | 'video';
  uri: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  durationMs?: number;
};

export type ServiceRequest = {
  id: string;
  clientId: string;
  clientName: string;
  category: ServiceCategory;
  title: string;
  description: string;
  city: string;
  urgency: RequestUrgency;
  media: RequestMedia[];
  status: ServiceRequestStatus;
  selectedQuoteId?: string;
  selectedProviderId?: string;
  createdAt: string;
};

export type ServiceQuote = {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  amount: number;
  estimatedDuration: string;
  message: string;
  includesMaterials: boolean;
  materialsDescription?: string;
  status: QuoteStatus;
  createdAt: string;
};

export type CommunityMessage = {
  id: string;
  requestId: string;
  quoteId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export type Appointment = {
  id: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  service: string;
  scheduledAt: string;
  details: string;
  status: AppointmentStatus;
  rejectionReason?: string;
  finalAmount?: number;
  items?: AppointmentItem[];
  totalCost?: number;
  paymentMethod?: PaymentMethod;
  completedAt?: string;
  createdAt: string;
  clientReviewed: boolean;
  providerReviewed: boolean;
};

export type CatalogItem = {
  id: string;
  providerId: string;
  kind: 'product' | 'service';
  name: string;
  description: string;
  costPrice: number;
  salePrice: number;
};

export type SelectedItem = { catalogItemId: string; quantity: number };
export type AppointmentItem = SelectedItem & {
  name: string;
  description: string;
  kind: CatalogItem['kind'];
  unitCost: number;
  unitPrice: number;
};

export type Review = {
  id: string;
  appointmentId: string;
  reviewerId: string;
  reviewedId: string;
  reviewerRole: UserRole;
  rating: number;
  comment?: string;
  moderationStatus: ModerationStatus;
  reportedBy?: string;
  createdAt: string;
};

export type CancellationRecord = {
  id: string;
  appointmentId: string;
  clientId: string;
  clientName: string;
  providerId: string;
  providerName: string;
  service: string;
  cancelledBy: UserRole;
  reason: CancellationReason;
  justification?: string;
  reply?: string;
  repliedBy?: string;
  repliedAt?: string;
  moderationStatus: ModerationStatus;
  reportedBy?: string;
  createdAt: string;
};

export type ReputationTab = 'reviews' | 'cancellations';

export type PublicClientProfile = {
  id: string;
  fullName: string;
  city?: string;
  avatarUrl?: string;
  rating: number | null;
  reviewCount: number;
  cancellationCount: number;
  completedServiceCount: number;
};

export type CreateAppointmentInput = {
  providerId: string;
  scheduledAt: string;
  details: string;
};

export type CreateServiceRequestInput = Pick<
  ServiceRequest,
  'category' | 'title' | 'description' | 'urgency' | 'media'
>;

export type CreateServiceQuoteInput = Pick<
  ServiceQuote,
  | 'requestId'
  | 'amount'
  | 'estimatedDuration'
  | 'message'
  | 'includesMaterials'
  | 'materialsDescription'
>;
