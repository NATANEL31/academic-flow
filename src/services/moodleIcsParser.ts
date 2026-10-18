export interface ParsedMoodleEvent {
  externalUid: string;
  rawTitle: string;
  cleanTitle: string;
  description: string | null;
  courseCode: string;
  dueDate: Date;
}

function cleanMoodleSummary(summary: string): string {
  return summary
    .replace(/^יש להגיש את\s+/i, '')
    .replace(/\s+עומד להסתיים$/i, '')
    .replace(/\s+is due$/i, '')
    .replace(/^האירוע\s+['"]?(.+?)['"]?\s+מגיע לסיומו$/i, '$1')
    .trim();
}

function parseIcsDate(icsDateStr: string): Date {
  const cleanStr = icsDateStr.split(':').pop()?.trim() || '';
  
  const match = cleanStr.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/
  );

  if (!match) {
    const dateOnlyMatch = cleanStr.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 0);
    }
    throw new Error(`Invalid ICS date format: ${icsDateStr}`);
  }

  const [, year, month, day, hour, minute, second, isUtc] = match;
  if (isUtc === 'Z') {
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

export function parseMoodleIcs(icsContent: string): ParsedMoodleEvent[] {
  const unfoldedContent = icsContent.replace(/\r?\n[ \t]/g, '');
  const lines = unfoldedContent.split(/\r?\n/);

  const events: ParsedMoodleEvent[] = [];
  let inEvent = false;
  let currentEvent: Record<string, string> = {};

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      inEvent = false;

      const uid = currentEvent['UID'];
      const summary = currentEvent['SUMMARY'];
      const dtEnd = currentEvent['DTEND'] || currentEvent['DTSTART'];
      const categories = currentEvent['CATEGORIES'] || 'GENERAL';

      if (uid && summary && dtEnd) {
        try {
          events.push({
            externalUid: uid.trim(),
            rawTitle: summary.trim(),
            cleanTitle: cleanMoodleSummary(summary),
            description: currentEvent['DESCRIPTION']
              ? currentEvent['DESCRIPTION'].replace(/\\n/g, '\n').replace(/\\,/g, ',').trim()
              : null,
            courseCode: categories.trim(),
            dueDate: parseIcsDate(dtEnd),
          });
        } catch (err) {
          console.warn(`Skipping event with invalid date: ${uid}`, err);
        }
      }
      continue;
    }

    if (inEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const rawKey = line.slice(0, colonIndex);
        const key = rawKey.split(';')[0].toUpperCase();
        const value = line.slice(colonIndex + 1);
        currentEvent[key] = value;
      }
    }
  }

  return events;
}