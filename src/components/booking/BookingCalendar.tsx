import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import type { WeeklyAvailability } from '@/types';
import { getAvailabilitySlots, isDateAvailable } from '@/utils/availability';
import {
  formatMonth,
  getCalendarDays,
  isSameDay,
  startOfDay,
} from '@/utils/date';

type BookingCalendarProps = {
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  availability: WeeklyAvailability;
  agendaOpen?: boolean;
};

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function BookingCalendar({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  availability,
  agendaOpen = true,
}: BookingCalendarProps) {
  const [referenceMonth, setReferenceMonth] = useState(selectedDate ?? new Date());
  const [minimumSelectableTime] = useState(() => Date.now() + 15 * 60 * 1000);
  const days = useMemo(() => getCalendarDays(referenceMonth), [referenceMonth]);
  const today = startOfDay(new Date());
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const visibleMonthStart = new Date(
    referenceMonth.getFullYear(),
    referenceMonth.getMonth(),
    1,
  );
  const canGoPrevious = visibleMonthStart > currentMonthStart;
  const timeSlots = useMemo(() => getAvailabilitySlots(availability), [availability]);

  const changeMonth = (offset: number) => {
    setReferenceMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <View>
      <View className="rounded-3xl border border-slate-200 bg-white p-4">
        <View className="mb-4 flex-row items-center justify-between">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            disabled={!canGoPrevious}
            onPress={() => changeMonth(-1)}
            pressedScale={0.9}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              canGoPrevious ? 'bg-slate-100 active:bg-slate-200' : 'opacity-30'
            }`}
          >
            <ChevronLeft size={20} color={colors.slate700} />
          </AnimatedPressable>
          <Text className="text-base font-bold text-slate-900">
            {formatMonth(referenceMonth)}
          </Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            onPress={() => changeMonth(1)}
            pressedScale={0.9}
            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 active:bg-slate-200"
          >
            <ChevronRight size={20} color={colors.slate700} />
          </AnimatedPressable>
        </View>

        <View className="mb-1 flex-row">
          {weekdays.map((weekday, index) => (
            <View key={`${weekday}-${index}`} className="w-[14.285%] items-center py-2">
              <Text className="text-xs font-bold text-slate-400">{weekday}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {days.map((date) => {
            const inCurrentMonth = date.getMonth() === referenceMonth.getMonth();
            const isPast = startOfDay(date) < today;
            const unavailable = !agendaOpen || !isDateAvailable(availability, date);
            const disabled = !inCurrentMonth || isPast || unavailable;
            const selected = selectedDate ? isSameDay(date, selectedDate) : false;
            const isToday = isSameDay(date, today);

            return (
              <View key={date.toISOString()} className="w-[14.285%] items-center py-1">
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel={date.toLocaleDateString('pt-BR')}
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelectDate(date)}
                  pressedScale={0.88}
                  className={`h-10 w-10 items-center justify-center rounded-full ${
                    selected
                      ? 'bg-brand-700'
                      : isToday
                        ? 'border border-brand-200 bg-brand-50'
                        : 'active:bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected
                        ? 'text-white'
                        : disabled
                          ? 'text-slate-300'
                          : isToday
                            ? 'text-brand-700'
                            : 'text-slate-700'
                    }`}
                  >
                    {date.getDate()}
                  </Text>
                </AnimatedPressable>
              </View>
            );
          })}
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
        <View className="h-3 w-3 rounded-full bg-slate-300" />
        <Text className="flex-1 text-xs leading-5 text-slate-500">
          Dias em cinza não fazem parte da agenda semanal deste profissional.
        </Text>
      </View>

      <View className="mt-5">
        <View className="mb-3 flex-row items-center gap-2">
          <Clock3 size={18} color={colors.brand700} />
          <Text className="text-base font-bold text-slate-900">Horários disponíveis</Text>
        </View>
        {selectedDate && agendaOpen ? (
          <View className="flex-row flex-wrap gap-2">
            {timeSlots.map((time) => {
              const selected = selectedTime === time;
              const [hours, minutes] = time.split(':').map(Number);
              const slotDate = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                hours,
                minutes,
              );
              const disabled = slotDate.getTime() <= minimumSelectableTime;
              return (
                <AnimatedPressable
                  key={time}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => onSelectTime(time)}
                  pressedScale={0.94}
                  className={`min-w-[30%] flex-1 items-center rounded-2xl border px-3 py-3 ${
                    selected
                      ? 'border-brand-700 bg-brand-700'
                      : disabled
                        ? 'border-slate-100 bg-slate-100 opacity-50'
                      : 'border-slate-200 bg-white active:bg-brand-50'
                  }`}
                >
                  <Text
                    className={`font-bold ${selected ? 'text-white' : 'text-slate-700'}`}
                  >
                    {time}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        ) : (
          <View className="rounded-2xl bg-brand-50 px-4 py-4">
            <Text className="text-center text-sm text-brand-700">
              {agendaOpen
                ? 'Selecione uma data disponível para ver os horários.'
                : 'A agenda deste profissional está fechada.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
