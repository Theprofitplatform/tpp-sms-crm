import { addDays, addMonths, startOfDay, startOfMonth } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export function isWithinQuietHours(
  timezone: string,
  quietStart: number = 21, // 9 PM
  quietEnd: number = 9 // 9 AM
): boolean {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, timezone);
  const hour = zonedNow.getHours();

  // If quiet hours cross midnight (e.g., 21:00 to 09:00)
  if (quietStart > quietEnd) {
    return hour >= quietStart || hour < quietEnd;
  }

  // Normal range (e.g., 09:00 to 17:00)
  return hour < quietStart || hour >= quietEnd;
}

export function getNextAllowedSendTime(
  timezone: string,
  quietStart: number = 21,
  quietEnd: number = 9
): Date {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, timezone);
  const hour = zonedNow.getHours();

  // If currently in quiet hours, return the end of quiet hours
  if (isWithinQuietHours(timezone, quietStart, quietEnd)) {
    const nextSend = new Date(zonedNow);
    nextSend.setHours(quietEnd, 0, 0, 0);

    // If it's past quiet end today, it must mean quiet hours cross midnight
    if (hour >= quietStart) {
      nextSend.setDate(nextSend.getDate() + 1);
    }

    return zonedTimeToUtc(nextSend, timezone);
  }

  // Not in quiet hours, can send now
  return now;
}

export function addSuppressionWindow(date: Date, windowDays: number = 90): Date {
  return addDays(date, windowDays);
}

export function getWarmupLimit(startDate: Date, currentDate: Date = new Date()): number {
  const daysSinceStart = Math.floor(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Warmup schedule: Day 1=50, Day 2=100, Day 3=200, Day 4+=300
  if (daysSinceStart === 0) return 50;
  if (daysSinceStart === 1) return 100;
  if (daysSinceStart === 2) return 200;
  return 300;
}

export function resetDaily(date: Date, timezone: string): Date {
  const zonedDate = utcToZonedTime(date, timezone);
  const nextDay = addDays(startOfDay(zonedDate), 1);
  return zonedTimeToUtc(nextDay, timezone);
}

export function resetMonthly(date: Date, timezone: string): Date {
  const zonedDate = utcToZonedTime(date, timezone);
  const nextMonth = addMonths(startOfMonth(zonedDate), 1);
  return zonedTimeToUtc(nextMonth, timezone);
}
