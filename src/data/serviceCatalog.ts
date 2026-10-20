export type ServiceKind = 'cleaning' | 'plumbing' | 'electrical' | 'furniture' | 'general';

export type ServicePresentation = {
  kind: ServiceKind;
  title: string;
  description: string;
  included: string[];
  accent: 'blue' | 'green';
};

export function getServicePresentation(profession: string): ServicePresentation {
  const normalized = profession.toLocaleLowerCase('pt-BR');

  if (normalized.includes('limpeza') || normalized.includes('diarista')) {
    return {
      kind: 'cleaning',
      title: 'Limpeza Residencial',
      description:
        'Limpeza completa para sua casa, com cuidado em ambientes internos, cozinha, banheiros, quartos e áreas comuns.',
      included: [
        'Limpeza completa dos ambientes',
        'Limpeza de cozinhas e banheiros',
        'Organização básica dos espaços',
        'Produtos de limpeza inclusos',
        'Flexibilidade de horários',
      ],
      accent: 'green',
    };
  }

  if (normalized.includes('encanador') || normalized.includes('hidrául')) {
    return {
      kind: 'plumbing',
      title: 'Encanador',
      description:
        'Serviços hidráulicos em geral: consertos, instalações, manutenção preventiva, vazamentos e desentupimentos.',
      included: [
        'Instalações hidráulicas',
        'Reparo de vazamentos',
        'Desentupimentos',
        'Manutenção preventiva',
        'Troca de registros e torneiras',
      ],
      accent: 'blue',
    };
  }

  if (normalized.includes('eletric')) {
    return {
      kind: 'electrical',
      title: 'Serviços Elétricos',
      description:
        'Instalações e reparos elétricos residenciais realizados com diagnóstico cuidadoso e foco em segurança.',
      included: [
        'Reparo de tomadas e interruptores',
        'Instalação de luminárias',
        'Revisão do quadro elétrico',
        'Troca de disjuntores',
        'Diagnóstico de falhas',
      ],
      accent: 'blue',
    };
  }

  if (normalized.includes('montador') || normalized.includes('móveis')) {
    return {
      kind: 'furniture',
      title: 'Montagem de Móveis',
      description:
        'Montagem, desmontagem e ajustes de móveis residenciais com organização e cuidado no acabamento.',
      included: [
        'Montagem de móveis novos',
        'Desmontagem para mudança',
        'Ajuste de portas e gavetas',
        'Fixação segura na parede',
        'Organização após o serviço',
      ],
      accent: 'blue',
    };
  }

  return {
    kind: 'general',
    title: profession,
    description: 'Atendimento profissional para resolver sua necessidade com segurança e transparência.',
    included: [
      'Avaliação da necessidade',
      'Orçamento transparente',
      'Atendimento profissional',
      'Agendamento pelo aplicativo',
    ],
    accent: 'blue',
  };
}
