import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import type { WeeklyAvailability } from '@/types';
import { formatBusinessHour, isDateAvailable } from '@/utils/availability';
import { formatMonth, getCalendarDays, isSameDay, startOfDay } from '@/utils/date';

type AvailabilityManagerProps = {
  value: WeeklyAvailability;
  onChange: (availability: WeeklyAvailability) => void;
};

const weekdayOptions = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];
const calendarWeekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function moveHour(time: string, offset: number) {
  const hour = Number(time.slice(0, 2));
  return `${String(Math.min(23, Math.max(0, hour + offset))).padStart(2, '0')}:00`;
}

export function AvailabilityManager({ value, onChange }: AvailabilityManagerProps) {
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const days = useMemo(() => getCalendarDays(referenceMonth), [referenceMonth]);
  const today = startOfDay(new Date());
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const visibleMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth(), 1);
  const canGoPrevious = visibleMonth > currentMonth;

  const changeTime = (field: 'startTime' | 'endTime', offset: number) => {
    const next = moveHour(value[field], offset);
    const nextStart = field === 'startTime' ? next : value.startTime;
    const nextEnd = field === 'endTime' ? next : value.endTime;
    if (nextStart >= nextEnd) return;
    onChange({ ...value, [field]: next });
  };

  return (
    <View className="rounded-3xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
          <CalendarDays size={20} color={colors.brand700} />
        </View>
        <View className="flex-1">
          <Text className="font-black text-slate-900">Calendário de atendimento</Text>
          <Text className="mt-0.5 text-xs text-slate-500">A prévia começa hoje e repete sua semana.</Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <AnimatedPressable
          accessibilityLabel="Mês anterior"
          disabled={!canGoPrevious}
          onPress={() =>
            setReferenceMonth(
              (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
            )
          }
          className={`h-9 w-9 items-center justify-center rounded-full bg-slate-100 ${
            canGoPrevious ? '' : 'opacity-30'
          }`}
        >
          <ChevronLeft size={18} color={colors.slate700} />
        </AnimatedPressable>
        <Text className="text-sm font-extrabold text-slate-800">
          {formatMonth(referenceMonth)}
        </Text>
        <AnimatedPressable
          accessibilityLabel="Próximo mês"
          onPress={() =>
            setReferenceMonth(
              (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
            )
          }
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
        >
          <ChevronRight size={18} color={colors.slate700} />
        </AnimatedPressable>
      </View>

      <View className="mt-3 flex-row">
        {calendarWeekdays.map((label, index) => (
          <View key={`${label}-${index}`} className="w-[14.285%] items-center py-1">
            <Text className="text-[10px] font-bold text-slate-400">{label}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row flex-wrap">
        {days.map((date) => {
          const inMonth = date.getMonth() === referenceMonth.getMonth();
          const inPast = startOfDay(date) < today;
          const active = inMonth && !inPast && isDateAvailable(value, date);
          const todayDate = isSameDay(date, today);
          return (
            <View key={date.toISOString()} className="w-[14.285%] items-center py-1">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  active ? 'bg-emerald-100' : todayDate ? 'border border-brand-300' : ''
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    !inMonth || inPast
                      ? 'text-slate-200'
                      : active
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                  }`}
                >
                  {date.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <Text className="mt-5 text-sm font-extrabold text-slate-800">Dias disponíveis</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {weekdayOptions.map((option) => {
          const selected = value.weekdays.includes(option.value);
          return (
            <AnimatedPressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange({
                  ...value,
                  weekdays: selected
                    ? value.weekdays.filter((day) => day !== option.value)
                    : [...value.weekdays, option.value].sort(),
                })
              }
              className={`min-w-[21%] flex-1 items-center rounded-xl border px-2 py-2.5 ${
                selected ? 'border-brand-700 bg-brand-700' : 'border-slate-200 bg-white'
              }`}
            >
              <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-600'}`}>
                {option.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <View className="mt-5 flex-row items-center gap-2">
        <Clock3 size={17} color={colors.brand700} />
        <Text className="text-sm font-extrabold text-slate-800">Horário comercial</Text>
      </View>
      <View className="mt-3 flex-row items-center gap-3">
        {(['startTime', 'endTime'] as const).map((field) => (
          <View key={field} className="flex-1">
            <Text className="mb-2 text-center text-[11px] font-bold text-slate-500">
              {field === 'startTime' ? 'Início' : 'Término'}
            </Text>
            <View className="flex-row items-center justify-between rounded-2xl bg-slate-50 p-1">
              <AnimatedPressable
                accessibilityLabel={`Diminuir ${field === 'startTime' ? 'início' : 'término'}`}
                onPress={() => changeTime(field, -1)}
                className="h-9 w-9 items-center justify-center rounded-xl bg-white"
              >
                <ChevronLeft size={17} color={colors.slate700} />
              </AnimatedPressable>
              <Text className="font-black text-slate-900">{formatBusinessHour(value[field])}</Text>
              <AnimatedPressable
                accessibilityLabel={`Aumentar ${field === 'startTime' ? 'início' : 'término'}`}
                onPress={() => changeTime(field, 1)}
                className="h-9 w-9 items-center justify-center rounded-xl bg-white"
              >
                <ChevronRight size={17} color={colors.slate700} />
              </AnimatedPressable>
            </View>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-center text-xs text-slate-500">
        Atendimento das {formatBusinessHour(value.startTime)} às {formatBusinessHour(value.endTime)}
      </Text>
    </View>
  );
}
