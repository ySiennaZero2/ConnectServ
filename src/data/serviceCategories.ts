import type { ProviderProfile, ServiceCategory } from '@/types';

export const serviceCategoryOptions: {
  id: ServiceCategory;
  label: string;
  shortLabel: string;
  description: string;
  keywords: string[];
}[] = [
  {
    id: 'electrical',
    label: 'Elétrica',
    shortLabel: 'Elétrica',
    description: 'Tomadas, iluminação, quadros e instalações.',
    keywords: ['eletric', 'elétrica', 'eletricista'],
  },
  {
    id: 'plumbing',
    label: 'Encanamento',
    shortLabel: 'Encanador',
    description: 'Vazamentos, torneiras, registros e tubulações.',
    keywords: ['encanador', 'hidrául', 'tubula'],
  },
  {
    id: 'cleaning',
    label: 'Limpeza',
    shortLabel: 'Limpeza',
    description: 'Limpeza residencial, comercial e organização.',
    keywords: ['limpeza', 'diarista', 'faxina'],
  },
  {
    id: 'furniture',
    label: 'Móveis e montagem',
    shortLabel: 'Móveis',
    description: 'Montagem, desmontagem e pequenos ajustes.',
    keywords: ['montador', 'móvel', 'móveis', 'marceneiro'],
  },
  {
    id: 'painting',
    label: 'Pintura',
    shortLabel: 'Pintura',
    description: 'Pintura interna, externa e pequenos reparos.',
    keywords: ['pintor', 'pintura'],
  },
  {
    id: 'air_conditioning',
    label: 'Ar-condicionado',
    shortLabel: 'Climatização',
    description: 'Instalação, limpeza e manutenção de aparelhos.',
    keywords: ['ar-condicionado', 'climatiza', 'refrigera'],
  },
  {
    id: 'general',
    label: 'Outros serviços',
    shortLabel: 'Outros',
    description: 'Necessidades que não se encaixam nas categorias acima.',
    keywords: [],
  },
];

export function getServiceCategory(category: ServiceCategory) {
  return (
    serviceCategoryOptions.find((option) => option.id === category) ??
    serviceCategoryOptions[serviceCategoryOptions.length - 1]
  );
}

export function inferServiceCategories(profession: string): ServiceCategory[] {
  const normalized = profession.toLocaleLowerCase('pt-BR');
  const matches = serviceCategoryOptions
    .filter((option) => option.id !== 'general')
    .filter((option) => option.keywords.some((keyword) => normalized.includes(keyword)))
    .map((option) => option.id);

  return matches.length ? matches : ['general'];
}

export function providerMatchesCategory(
  provider: ProviderProfile,
  category: ServiceCategory,
) {
  const categories = provider.serviceCategories?.length
    ? provider.serviceCategories
    : inferServiceCategories(provider.profession);
  return categories.includes(category) || categories.includes('general');
}
