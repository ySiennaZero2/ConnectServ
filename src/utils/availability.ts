import type { ProviderProfile, WeeklyAvailability } from '@/types';

export const defaultAvailability: WeeklyAvailability = {
  weekdays: [1, 2, 3, 4, 5],
  startTime: '08:00',
  endTime: '18:00',
};

export function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatBusinessHour(time: string) {
  const [hours, minutes] = time.split(':');
  return minutes === '00' ? `${hours}h` : `${hours}h${minutes}`;
}

export function isDateAvailable(
  availability: WeeklyAvailability,
  date: Date,
) {
  return availability.weekdays.includes(date.getDay());
}

export function isTimeAvailable(
  availability: WeeklyAvailability,
  time: string,
) {
  const minutes = timeToMinutes(time);
  return (
    minutes >= timeToMinutes(availability.startTime) &&
    minutes < timeToMinutes(availability.endTime)
  );
}

export function isProviderAvailableAt(provider: ProviderProfile, date: Date) {
  if (!provider.agendaOpen || !isDateAvailable(provider.availability, date)) return false;
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
  return isTimeAvailable(provider.availability, time);
}

export function getProviderAvailabilityStatus(
  provider: ProviderProfile,
  now = new Date(),
) {
  const available = isProviderAvailableAt(provider, now);
  return {
    available,
    label: available
      ? `Disponível hoje das ${formatBusinessHour(provider.availability.startTime)} às ${formatBusinessHour(provider.availability.endTime)}`
      : 'Indisponível no momento',
  };
}

export function getAvailabilitySlots(availability: WeeklyAvailability) {
  const start = timeToMinutes(availability.startTime);
  const end = timeToMinutes(availability.endTime);
  const slots: string[] = [];
  for (let minutes = start; minutes < end; minutes += 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`);
  }
  return slots;
}

export function formatAvailabilityDays(weekdays: number[]) {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  if (weekdays.length === 7) return 'Todos os dias';
  if (!weekdays.length) return 'Nenhum dia ativo';
  return weekdays.map((day) => labels[day]).join(', ');
}
