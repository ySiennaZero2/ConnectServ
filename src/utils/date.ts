const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getCalendarDays(reference: Date) {
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const firstVisibleDay = new Date(firstDay);
  firstVisibleDay.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    return date;
  });
}

export function formatMonth(date: Date) {
  const label = monthFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatAppointmentDate(isoDate: string) {
  const date = new Date(isoDate);
  const day = dateFormatter.format(date).replace('.', '');
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} às ${time}`;
}

export function toScheduledIso(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const scheduled = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  );
  return scheduled.toISOString();
}

export function createRelativeIso(daysFromToday: number, hour: number) {
  const date = startOfDay(new Date());
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}
