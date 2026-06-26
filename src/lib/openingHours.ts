// Parses free-form opening_hours strings like:
//   "Seg-Sex: 11h às 23h\nSáb-Dom: 11h às 00h"
//   "Todos os dias 18:00 às 23:30"
// and decides whether the venue is currently open (America/Sao_Paulo timezone).
//
// Returns { isOpen: true } when no schedule is provided so we don't accidentally
// mark a store as closed for restaurants that haven't filled the field.

export function isRestaurantOpenNow(openingHours: string | null | undefined): {
  isOpen: boolean;
  hasSchedule: boolean;
} {
  if (!openingHours || !openingHours.trim()) {
    return { isOpen: true, hasSchedule: false };
  }

  const now = new Date();
  const brazil = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );
  const day = brazil.getDay(); // 0=Sun..6=Sat
  const minutesNow = brazil.getHours() * 60 + brazil.getMinutes();

  const lines = openingHours.split(/\n|;/).map(l => l.trim()).filter(Boolean);
  let matched = false;

  for (const line of lines) {
    // Try to find HH(:MM)?h? ... HH(:MM)?h?
    const m = line.match(
      /(\d{1,2})(?:[:h](\d{2}))?\s*(?:às|as|a|-|até|ate)\s*(\d{1,2})(?:[:h](\d{2}))?/i
    );
    if (!m) continue;

    const openMin = parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
    let closeMin = parseInt(m[3]) * 60 + (m[4] ? parseInt(m[4]) : 0);
    if (closeMin === 0) closeMin = 24 * 60; // "00h" treated as midnight close

    const isWeekend = day === 0 || day === 6;
    const lineMentionsWeekend = /s[áa]b|dom|fim\s*de\s*semana/i.test(line);
    const lineMentionsWeekday = /seg|ter|qua|qui|sex|semana/i.test(line);
    const lineApplies =
      (!lineMentionsWeekend && !lineMentionsWeekday) ||
      (isWeekend && lineMentionsWeekend) ||
      (!isWeekend && lineMentionsWeekday);

    if (!lineApplies) continue;
    matched = true;

    const overnight = closeMin <= openMin;
    const open = overnight
      ? minutesNow >= openMin || minutesNow < closeMin
      : minutesNow >= openMin && minutesNow < closeMin;

    if (open) return { isOpen: true, hasSchedule: true };
  }

  // If we matched at least one applicable line but none was open => closed.
  // If no line matched (unparsable schedule), fall back to open to avoid
  // false negatives.
  return { isOpen: !matched, hasSchedule: true };
}

// Returns a human-friendly hint about the next opening window, e.g.
// "Abre hoje às 18:00" or "Abre amanhã às 11:00". Returns null when
// no schedule is provided or we can't parse anything useful.
export function getNextOpeningInfo(
  openingHours: string | null | undefined
): string | null {
  if (!openingHours || !openingHours.trim()) return null;

  const now = new Date();
  const brazil = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  );
  const day = brazil.getDay();
  const minutesNow = brazil.getHours() * 60 + brazil.getMinutes();
  const isWeekend = day === 0 || day === 6;

  const lines = openingHours.split(/\n|;/).map(l => l.trim()).filter(Boolean);
  const candidates: { applies: 'today' | 'weekday' | 'weekend' | 'any'; openMin: number; raw: string }[] = [];

  for (const line of lines) {
    const m = line.match(
      /(\d{1,2})(?:[:h](\d{2}))?\s*(?:às|as|a|-|até|ate)\s*(\d{1,2})(?:[:h](\d{2}))?/i
    );
    if (!m) continue;
    const openMin = parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0);
    const mentionsWeekend = /s[áa]b|dom|fim\s*de\s*semana/i.test(line);
    const mentionsWeekday = /seg|ter|qua|qui|sex|semana/i.test(line);
    const applies: 'weekday' | 'weekend' | 'any' = mentionsWeekend
      ? 'weekend'
      : mentionsWeekday
        ? 'weekday'
        : 'any';
    candidates.push({ applies, openMin, raw: line });
  }

  if (candidates.length === 0) return null;

  const fmt = (m: number) => {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    return `${h}:${mm}`;
  };

  // Today's applicable openings still in the future
  const todayApplicable = candidates.filter(
    c => c.applies === 'any' || (isWeekend ? c.applies === 'weekend' : c.applies === 'weekday')
  );
  const upcomingToday = todayApplicable
    .filter(c => c.openMin > minutesNow)
    .sort((a, b) => a.openMin - b.openMin)[0];
  if (upcomingToday) return `Abre hoje às ${fmt(upcomingToday.openMin)}`;

  // Tomorrow
  const tomorrowIsWeekend = (day + 1) % 7 === 0 || (day + 1) % 7 === 6;
  const tomorrowApplicable = candidates.filter(
    c => c.applies === 'any' || (tomorrowIsWeekend ? c.applies === 'weekend' : c.applies === 'weekday')
  );
  const firstTomorrow = tomorrowApplicable.sort((a, b) => a.openMin - b.openMin)[0];
  if (firstTomorrow) return `Abre amanhã às ${fmt(firstTomorrow.openMin)}`;

  return null;
}
