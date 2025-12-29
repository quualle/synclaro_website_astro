import type { APIRoute } from 'astro';

export const prerender = false;

// CRM Supabase (enthält calendar_credentials)
const CRM_SUPABASE_URL = 'https://xmlrqsyzmnuidjsxghco.supabase.co';
const CRM_SUPABASE_SERVICE_KEY = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.GOOGLE_CLIENT_SECRET;

interface CalendarCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

interface TimeSlot {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:MM
  datetime: string;    // ISO string
  available: boolean;
}

// Refresh access token if expired
async function refreshAccessToken(credentials: CalendarCredentials): Promise<CalendarCredentials> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: credentials.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const tokens = await response.json();

  // Update tokens in CRM Supabase
  await fetch(`${CRM_SUPABASE_URL}/rest/v1/calendar_credentials?user_id=eq.default`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CRM_SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${CRM_SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({
      access_token: tokens.access_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000),
      updated_at: new Date().toISOString(),
    }),
  });

  return {
    access_token: tokens.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: Date.now() + (tokens.expires_in * 1000),
  };
}

// Get calendar credentials from CRM Supabase
async function getCalendarCredentials(): Promise<CalendarCredentials> {
  const response = await fetch(
    `${CRM_SUPABASE_URL}/rest/v1/calendar_credentials?user_id=eq.default&select=*`,
    {
      headers: {
        'apikey': CRM_SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${CRM_SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch calendar credentials');
  }

  const data = await response.json();
  if (data.length === 0) {
    throw new Error('No calendar credentials found. Please connect Google Calendar first.');
  }

  let credentials = data[0] as CalendarCredentials;

  // Check if token is expired (with 5 min buffer)
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (credentials.expiry_date < now + fiveMinutes) {
    console.log('[Available Slots] Token expired, refreshing...');
    credentials = await refreshAccessToken(credentials);
  }

  return credentials;
}

// Fetch Google Calendar events
async function getCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch calendar events: ${error}`);
  }

  const data = await response.json();
  return data.items || [];
}

// Timezone configuration - Europe/Zurich (CET/CEST)
const TIMEZONE = 'Europe/Zurich';

// Helper: Get timezone offset in minutes for a given date in Europe/Zurich
function getZurichOffset(date: Date): number {
  // Create a date string in Zurich timezone and parse it back
  const zurichStr = date.toLocaleString('en-US', { timeZone: TIMEZONE });
  const zurichDate = new Date(zurichStr);
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return (zurichDate.getTime() - utcDate.getTime()) / 60000;
}

// Helper: Create a Date object for a specific time in Europe/Zurich
function createZurichDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Create date in UTC first
  const utcDate = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  // Get the offset for this date in Zurich
  const offset = getZurichOffset(utcDate);
  // Subtract the offset to get the correct UTC time for Zurich local time
  return new Date(utcDate.getTime() - offset * 60000);
}

// Helper: Format date as YYYY-MM-DD in Zurich timezone
function formatDateZurich(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: TIMEZONE });
}

// Helper: Get day of week in Zurich timezone (0=Sunday, 1=Monday, etc.)
function getDayOfWeekZurich(date: Date): number {
  const zurichStr = date.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'short' });
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  return dayMap[zurichStr] ?? 0;
}

// Generate available time slots
function generateTimeSlots(
  startDate: Date,
  endDate: Date,
  busyPeriods: Array<{ start: Date; end: Date }>
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Slot configuration
  const SLOT_DURATION_MINUTES = 15;
  const START_HOUR = 9;
  const END_HOUR = 17;

  // Get start date in Zurich timezone
  const startDateStr = formatDateZurich(startDate);
  const endDateStr = formatDateZurich(endDate);

  // Parse start date components
  let [year, month, day] = startDateStr.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

  // Iterate through each day
  while (year < endYear || (year === endYear && (month < endMonth || (month === endMonth && day <= endDay)))) {
    // Create a date for this day to check day of week
    const checkDate = createZurichDate(year, month - 1, day, 12, 0);
    const dayOfWeek = getDayOfWeekZurich(checkDate);

    // Only Monday (1) to Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // Generate slots from 9:00 to 16:45 (last slot that ends by 17:00)
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
          // Create slot times in Zurich timezone
          const slotStart = createZurichDate(year, month - 1, day, hour, minute);
          const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);

          // Skip past slots (compare with current time)
          if (slotStart <= new Date()) {
            continue;
          }

          // Check if slot overlaps with any busy period
          const isAvailable = !busyPeriods.some(busy =>
            slotStart < busy.end && slotEnd > busy.start
          );

          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

          slots.push({
            date: dateStr,
            time: timeStr,
            datetime: slotStart.toISOString(),
            available: isAvailable,
          });
        }
      }
    }

    // Move to next day
    day++;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) {
      day = 1;
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  return slots;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // Check for required environment variables
    if (!CRM_SUPABASE_SERVICE_KEY) {
      console.error('[Available Slots] Missing CRM_SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[Available Slots] Missing Google OAuth credentials');
      return new Response(
        JSON.stringify({ error: 'Google Calendar not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const daysAhead = parseInt(url.searchParams.get('days') || '7');

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);

    // Get calendar credentials
    const credentials = await getCalendarCredentials();

    // Fetch calendar events
    const events = await getCalendarEvents(
      credentials.access_token,
      startDate.toISOString(),
      endDate.toISOString()
    );

    console.log(`[Available Slots] Found ${events.length} calendar events`);

    // Extract busy periods from events
    const busyPeriods = events
      .filter(event => event.start?.dateTime && event.end?.dateTime)
      .map(event => ({
        start: new Date(event.start.dateTime!),
        end: new Date(event.end.dateTime!),
      }));

    // Generate available slots
    const allSlots = generateTimeSlots(startDate, endDate, busyPeriods);

    // Filter to only available slots
    const availableSlots = allSlots.filter(slot => slot.available);

    // Group by date for better frontend display
    const slotsByDate: Record<string, TimeSlot[]> = {};
    for (const slot of availableSlots) {
      if (!slotsByDate[slot.date]) {
        slotsByDate[slot.date] = [];
      }
      slotsByDate[slot.date].push(slot);
    }

    return new Response(
      JSON.stringify({
        success: true,
        range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        totalSlots: allSlots.length,
        availableSlots: availableSlots.length,
        slotsByDate,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  } catch (error) {
    console.error('[Available Slots] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch available slots'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
