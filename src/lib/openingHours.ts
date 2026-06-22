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
