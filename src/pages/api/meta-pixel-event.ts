import type { APIRoute } from 'astro';
import { createHash } from 'crypto';

export const prerender = false;

// Meta CAPI Configuration
const PIXEL_ID = '1497847851628194';
const CAPI_VERSION = 'v21.0';
const CAPI_ENDPOINT = `https://graph.facebook.com/${CAPI_VERSION}/${PIXEL_ID}/events`;

// SHA256 hash function for user data (required by Meta CAPI)
function hashUserData(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  return createHash('sha256').update(normalized).digest('hex');
}

// Get client IP from request headers
function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || undefined;
}

// Send event to Meta Conversions API
async function sendToMetaCAPI(
  data: MetaPixelEventPayload,
  clientIP: string | undefined,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build user_data object with hashed values
    const userData: Record<string, string | undefined> = {};

    // Add fbclid for click attribution (not hashed)
    if (data.fbclid) {
      userData.fbc = `fb.1.${Date.now()}.${data.fbclid}`;
    }

    // Add fbp (browser ID) if available
    if (data.visitor_id) {
      userData.fbp = `fb.1.${Date.now()}.${data.visitor_id}`;
    }

    // Add client IP (not hashed)
    if (clientIP) {
      userData.client_ip_address = clientIP;
    }

    // Add user agent (not hashed)
    if (data.user_agent) {
      userData.client_user_agent = data.user_agent;
    }

    // Build the event object
    const eventData = {
      event_name: data.event_name,
      event_time: Math.floor(Date.now() / 1000), // Unix timestamp
      event_id: data.event_id, // Same ID used by browser pixel for deduplication
      action_source: 'website',
      event_source_url: data.page_url,
      user_data: userData,
      custom_data: {
        content_category: 'coaching',
        content_name: data.event_name === 'Lead' ? 'KI-Coaching Bewerbung' :
                      data.event_name === 'Schedule' ? 'KI-Coaching Termin' :
                      data.event_name === 'ViewContent' ? 'KI-Coaching Landing Page' : undefined,
        ...(data.scroll_depth && { scroll_depth: data.scroll_depth }),
        ...(data.time_on_page && { time_on_page: data.time_on_page }),
        ...(data.application_id && { application_id: data.application_id }),
        ...(data.appointment_date && { appointment_date: data.appointment_date }),
      }
    };

    // Remove undefined values from custom_data
    Object.keys(eventData.custom_data).forEach(key => {
      if ((eventData.custom_data as Record<string, unknown>)[key] === undefined) {
        delete (eventData.custom_data as Record<string, unknown>)[key];
      }
    });

    const payload = {
      data: [eventData],
      // Test mode can be enabled for debugging (remove in production)
      // test_event_code: 'TEST12345'
    };

    const response = await fetch(`${CAPI_ENDPOINT}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Meta CAPI] Error:', response.status, errorText);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log(`[Meta CAPI] Sent: ${data.event_name} (${data.event_id})`, result);
    return { success: true };
  } catch (error) {
    console.error('[Meta CAPI] Exception:', error);
    return { success: false, error: String(error) };
  }
}

interface MetaPixelEventPayload {
  event_name: string;
  event_id: string;
  session_id: string;
  visitor_id?: string;
  fbclid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  page_url?: string;
  page_path?: string;
  referrer?: string;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  scroll_depth?: number;
  time_on_page?: number;
  application_id?: string;
  appointment_date?: string;
  event_data?: Record<string, unknown>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: MetaPixelEventPayload = await request.json();

    // Get client IP for CAPI
    const clientIP = getClientIP(request);

    // Use CRM Supabase where meta_pixel_events table lives
    const supabaseUrl = import.meta.env.CRM_SUPABASE_URL || 'https://xmlrqsyzmnuidjsxghco.supabase.co';
    const supabaseKey = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;
    const capiAccessToken = import.meta.env.META_CAPI_ACCESS_TOKEN;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Meta Pixel API] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.event_name || !data.event_id || !data.session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the record for meta_pixel_events table
    const record = {
      event_name: data.event_name,
      event_id: data.event_id,
      session_id: data.session_id,
      visitor_id: data.visitor_id || null,
      fbclid: data.fbclid || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
      page_url: data.page_url || null,
      page_path: data.page_path || null,
      referrer: data.referrer || null,
      user_agent: data.user_agent || null,
      device_type: data.device_type || null,
      browser: data.browser || null,
      scroll_depth: data.scroll_depth || null,
      time_on_page: data.time_on_page || null,
      application_id: data.application_id || null,
      appointment_date: data.appointment_date || null,
      event_data: data.event_data || {},
      event_time: new Date().toISOString()
    };

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    };

    // Execute Supabase insert and Meta CAPI in parallel
    const supabasePromise = fetch(
      `${supabaseUrl}/rest/v1/meta_pixel_events`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
      }
    );

    // Send to Meta CAPI if access token is configured
    const capiPromise = capiAccessToken
      ? sendToMetaCAPI(data, clientIP, capiAccessToken)
      : Promise.resolve({ success: false, error: 'CAPI not configured' });

    // Wait for both to complete
    const [supabaseResponse, capiResult] = await Promise.all([supabasePromise, capiPromise]);

    // Log results
    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text();
      console.error('[Meta Pixel API] Supabase insert error:', supabaseResponse.status, errorText);
    }

    if (!capiResult.success && capiAccessToken) {
      console.error('[Meta Pixel API] CAPI error:', capiResult.error);
    }

    // Log successful tracking
    console.log(`[Meta Pixel API] Tracked: ${data.event_name} (${data.event_id}) - Supabase: ${supabaseResponse.ok ? 'OK' : 'FAIL'}, CAPI: ${capiResult.success ? 'OK' : 'SKIP/FAIL'}`);

    return new Response(
      JSON.stringify({
        success: true,
        supabase: supabaseResponse.ok,
        capi: capiResult.success
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Meta Pixel API] Error:', error);
    // Don't fail the request - tracking should be non-blocking
    return new Response(
      JSON.stringify({ success: true, warning: 'Error processing event' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'Meta Pixel Event API is running' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
