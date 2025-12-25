import type { APIRoute } from 'astro';

export const prerender = false;

interface LPBehaviorPayload {
  session_id: string;
  page_path: string;
  event_type: 'page_view' | 'scroll' | 'interaction' | 'form_field' | 'form_submit' | 'session_end';
  scroll_depth?: number;
  time_on_page?: number;
  interactions?: {
    clicks?: Array<{
      element_id?: string;
      element_type: string;
      element_label?: string;
      section_id?: string;
      is_cta: boolean;
      timestamp: string;
    }>;
    form_fields?: Array<{
      field_name: string;
      field_type: string;
      action: 'focus' | 'blur' | 'input' | 'filled';
      value_length?: number;
      timestamp: string;
    }>;
    sections_viewed?: string[];
    form_submitted?: boolean;
    form_submission_time?: string;
  };
  device_type?: string;
  referrer?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: LPBehaviorPayload = await request.json();

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[LP Behavior API] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.session_id || !data.page_path) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=minimal',
    };

    // Build the record for lp_user_behavior table
    const record = {
      session_id: data.session_id,
      page_path: data.page_path,
      event_type: data.event_type,
      scroll_depth: data.scroll_depth || null,
      time_on_page: data.time_on_page || null,
      interactions: data.interactions || null,
      device_type: data.device_type || null,
      referrer: data.referrer || null,
      user_agent: data.user_agent || null,
    };

    // Insert into lp_user_behavior
    const response = await fetch(
      `${supabaseUrl}/rest/v1/lp_user_behavior`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(record),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LP Behavior API] Insert error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LP Behavior API] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to track behavior' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'LP Behavior API is running' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
