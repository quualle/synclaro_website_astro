import type { APIRoute } from 'astro';

export const prerender = false;

// CRM Supabase (enthält calendar_credentials UND lp_coaching_applications)
const CRM_SUPABASE_URL = 'https://xmlrqsyzmnuidjsxghco.supabase.co';
const CRM_SUPABASE_SERVICE_KEY = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.GOOGLE_CLIENT_SECRET;

interface BookingRequest {
  applicationId: string;
  datetime: string; // ISO string
  notes?: string;
}

interface CalendarCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
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

// Get calendar credentials
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
    throw new Error('Calendar not connected');
  }

  let credentials = data[0] as CalendarCredentials;

  // Refresh if expired
  if (credentials.expiry_date < Date.now() + 5 * 60 * 1000) {
    credentials = await refreshAccessToken(credentials);
  }

  return credentials;
}

// Check if slot is still available
async function isSlotAvailable(accessToken: string, datetime: Date): Promise<boolean> {
  const slotStart = datetime;
  const slotEnd = new Date(datetime);
  slotEnd.setMinutes(slotEnd.getMinutes() + 15);

  const params = new URLSearchParams({
    timeMin: slotStart.toISOString(),
    timeMax: slotEnd.toISOString(),
    singleEvents: 'true',
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to check calendar availability');
  }

  const data = await response.json();
  const events = data.items || [];

  // Slot is available if no events overlap
  return events.length === 0;
}

// Create Google Calendar event
async function createCalendarEvent(
  accessToken: string,
  datetime: Date,
  applicantName: string,
  applicantEmail: string,
  program: string
): Promise<string> {
  const startTime = datetime;
  const endTime = new Date(datetime);
  endTime.setMinutes(endTime.getMinutes() + 15);

  const programNames: Record<string, string> = {
    'gruppen_coaching': 'Gruppen-Coaching',
    'mastermind': 'Mastermind',
    'beide': 'Gruppen-Coaching & Mastermind'
  };

  const event = {
    summary: `Kennenlerngespräch: ${applicantName}`,
    description: `Bewerbungsgespräch für ${programNames[program] || program}\n\nBewerber: ${applicantName}\nE-Mail: ${applicantEmail}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Europe/Zurich',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/Zurich',
    },
    attendees: [
      { email: applicantEmail, displayName: applicantName }
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create calendar event: ${error}`);
  }

  const createdEvent = await response.json();
  return createdEvent.id;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check environment variables
    if (!CRM_SUPABASE_SERVICE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body: BookingRequest = await request.json();
    const { applicationId, datetime, notes } = body;

    // Validate required fields
    if (!applicationId || !datetime) {
      return new Response(
        JSON.stringify({ error: 'applicationId und datetime sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const appointmentDatetime = new Date(datetime);

    // Validate datetime is in the future
    if (appointmentDatetime <= new Date()) {
      return new Response(
        JSON.stringify({ error: 'Termin muss in der Zukunft liegen' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the application to verify it exists
    const appResponse = await fetch(
      `${CRM_SUPABASE_URL}/rest/v1/lp_coaching_applications?id=eq.${applicationId}&select=*`,
      {
        headers: {
          'apikey': CRM_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${CRM_SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!appResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Fehler beim Laden der Bewerbung' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const applications = await appResponse.json();

    if (applications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Bewerbung nicht gefunden' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const application = applications[0];

    // Check if appointment already booked
    if (application.appointment_booked) {
      return new Response(
        JSON.stringify({ error: 'Du hast bereits einen Termin gebucht', existingDatetime: application.appointment_datetime }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get calendar credentials
    const credentials = await getCalendarCredentials();

    // Check if slot is still available
    const available = await isSlotAvailable(credentials.access_token, appointmentDatetime);

    if (!available) {
      return new Response(
        JSON.stringify({ error: 'Dieser Termin ist leider nicht mehr verfügbar. Bitte wähle einen anderen.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Google Calendar event
    const eventId = await createCalendarEvent(
      credentials.access_token,
      appointmentDatetime,
      `${application.first_name} ${application.last_name}`,
      application.email,
      application.program_interest
    );

    console.log(`[Book Appointment] Created calendar event: ${eventId}`);

    // Update application with appointment details
    const updateResponse = await fetch(
      `${CRM_SUPABASE_URL}/rest/v1/lp_coaching_applications?id=eq.${applicationId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': CRM_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${CRM_SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          appointment_booked: true,
          appointment_datetime: appointmentDatetime.toISOString(),
          appointment_notes: notes || null,
          google_calendar_event_id: eventId,
          status: 'contacted', // Update status
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error('[Book Appointment] Failed to update application:', await updateResponse.text());
      return new Response(
        JSON.stringify({ error: 'Termin wurde erstellt, aber Bewerbung konnte nicht aktualisiert werden' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedApplication = await updateResponse.json();

    // Format datetime for user display
    const formattedDate = appointmentDatetime.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = appointmentDatetime.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Termin erfolgreich gebucht!',
        appointment: {
          datetime: appointmentDatetime.toISOString(),
          formattedDate,
          formattedTime,
          calendarEventId: eventId,
        },
        application: updatedApplication[0],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[Book Appointment] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Fehler beim Buchen des Termins'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
