import type { APIRoute } from 'astro';

export const prerender = false;

interface TrackingPayload {
  event_type: 'pageview' | 'click' | 'section_view' | 'session_update';
  page: string;
  referrer?: string | null;
  user_agent?: string;
  device_type?: string;
  browser?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  session_id?: string | null;
  timestamp?: string;
  website_domain?: string;
  // Click-specific
  element_id?: string;
  element_type?: string;
  element_label?: string;
  section_id?: string;
  is_cta?: boolean;
  // Section view-specific
  section_name?: string;
  // Session update-specific
  total_duration_seconds?: number;
  total_clicks?: number;
  total_sections_viewed?: number;
  max_scroll_depth?: number;
}

// Helper to ensure session exists before inserting dependent records
async function ensureSessionExists(
  supabaseUrl: string,
  headers: Record<string, string>,
  sessionId: string,
  pagePath: string,
  websiteDomain: string
): Promise<void> {
  const sessionPayload = {
    session_id: sessionId,
    website_domain: websiteDomain,
    page_path: pagePath,
    entry_time: new Date().toISOString(),
    total_clicks: 0,
    total_sections_viewed: 0,
  };

  // Use upsert to create session if it doesn't exist
  await fetch(
    `${supabaseUrl}/rest/v1/website_user_behavior_sessions`,
    {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(sessionPayload),
    }
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: TrackingPayload = await request.json();

    // Get environment variables
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Track API] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!data.session_id || !data.page) {
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

    const websiteDomain = data.website_domain || 'synclaro.de';

    // Handle different event types
    switch (data.event_type) {
      case 'pageview': {
        // Insert or update session in website_user_behavior_sessions
        const sessionPayload = {
          session_id: data.session_id,
          website_domain: websiteDomain,
          page_path: data.page,
          entry_time: data.timestamp || new Date().toISOString(),
          user_agent: data.user_agent || null,
          referrer: data.referrer || null,
          utm_source: data.utm_source || null,
          utm_medium: data.utm_medium || null,
          utm_campaign: data.utm_campaign || null,
          device_type: data.device_type || null,
          browser: data.browser || null,
          total_clicks: 0,
          total_sections_viewed: 0,
        };

        const sessionResponse = await fetch(
          `${supabaseUrl}/rest/v1/website_user_behavior_sessions`,
          {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(sessionPayload),
          }
        );

        if (!sessionResponse.ok) {
          const errorText = await sessionResponse.text();
          console.error('[Track API] Session insert error:', sessionResponse.status, errorText);
        }
        break;
      }

      case 'click': {
        // Ensure session exists first (handles race condition with pageview)
        await ensureSessionExists(supabaseUrl, headers, data.session_id, data.page, websiteDomain);

        // Insert into website_user_behavior_interactions
        const interactionPayload = {
          session_id: data.session_id,
          interaction_type: data.is_cta ? 'cta_click' : 'click',
          element_id: data.element_id || null,
          element_type: data.element_type || null,
          element_label: data.element_label?.substring(0, 200) || null,
          section_id: data.section_id || null,
          page_path: data.page,
          interaction_value: data.is_cta ? 'cta' : null,
          occurred_at: data.timestamp || new Date().toISOString(),
        };

        const clickResponse = await fetch(
          `${supabaseUrl}/rest/v1/website_user_behavior_interactions`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(interactionPayload),
          }
        );

        if (!clickResponse.ok) {
          const errorText = await clickResponse.text();
          console.error('[Track API] Interaction insert error:', clickResponse.status, errorText);
        }
        break;
      }

      case 'section_view': {
        // Ensure session exists first (handles race condition with pageview)
        await ensureSessionExists(supabaseUrl, headers, data.session_id, data.page, websiteDomain);

        // Insert into website_user_behavior_section_views
        const sectionPayload = {
          session_id: data.session_id,
          section_id: data.section_id || 'unknown',
          section_name: data.section_name || 'Unknown Section',
          page_path: data.page,
          entered_at: data.timestamp || new Date().toISOString(),
          interactions_count: 0,
        };

        const sectionResponse = await fetch(
          `${supabaseUrl}/rest/v1/website_user_behavior_section_views`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(sectionPayload),
          }
        );

        if (!sectionResponse.ok) {
          const errorText = await sectionResponse.text();
          console.error('[Track API] Section insert error:', sectionResponse.status, errorText);
        }
        break;
      }

      case 'session_update': {
        // Update existing session with duration, clicks, etc.
        const updatePayload = {
          total_duration_seconds: data.total_duration_seconds || 0,
          total_clicks: data.total_clicks || 0,
          total_sections_viewed: data.total_sections_viewed || 0,
          updated_at: new Date().toISOString(),
        };

        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/website_user_behavior_sessions?session_id=eq.${data.session_id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updatePayload),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('[Track API] Session update error:', updateResponse.status, errorText);
        }
        break;
      }

      default:
        // Silently ignore unknown event types to avoid log spam
        break;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Track API] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to track event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Health check endpoint
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ status: 'ok', message: 'Tracking API is running' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
