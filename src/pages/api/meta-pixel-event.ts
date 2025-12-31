import type { APIRoute } from 'astro';

export const prerender = false;

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

    // Use CRM Supabase where meta_pixel_events table lives
    const supabaseUrl = import.meta.env.CRM_SUPABASE_URL || 'https://xmlrqsyzmnuidjsxghco.supabase.co';
    const supabaseKey = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

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

    // Insert into meta_pixel_events
    const response = await fetch(
      `${supabaseUrl}/rest/v1/meta_pixel_events`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Meta Pixel API] Insert error:', response.status, errorText);
      // Don't fail the request - tracking should be non-blocking
      return new Response(
        JSON.stringify({ success: true, warning: 'Database insert failed but event was received' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log successful tracking
    console.log(`[Meta Pixel API] Tracked: ${data.event_name} (${data.event_id})`);

    return new Response(
      JSON.stringify({ success: true }),
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
