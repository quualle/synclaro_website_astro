import type { APIRoute } from 'astro';

export const prerender = false;

interface SessionPayload {
  action: 'create' | 'heartbeat' | 'form_open' | 'form_submit' | 'end';
  session_id: string;
  visitor_id?: string;
  page_path?: string;
  page_url?: string;
  device_type?: string;
  browser?: string;
  user_agent?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  referrer?: string;
  time_on_page_seconds?: number;
  max_scroll_depth?: number;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: SessionPayload = await request.json();

    const supabaseUrl = import.meta.env.CRM_SUPABASE_URL || 'https://xmlrqsyzmnuidjsxghco.supabase.co';
    const supabaseKey = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[LP Session] Missing Supabase config');
      return new Response(JSON.stringify({ success: false }), { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    };

    const now = new Date().toISOString();

    if (data.action === 'create') {
      // Create new session
      const record = {
        session_id: data.session_id,
        visitor_id: data.visitor_id || null,
        page_path: data.page_path || null,
        page_url: data.page_url || null,
        device_type: data.device_type || null,
        browser: data.browser || null,
        user_agent: data.user_agent || null,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_content: data.utm_content || null,
        utm_term: data.utm_term || null,
        fbclid: data.fbclid || null,
        referrer: data.referrer || null,
        time_on_page_seconds: 0,
        max_scroll_depth: 0,
        is_bounce: true,
        session_start: now,
        last_heartbeat: now,
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/lp_session_tracking`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[LP Session] Create error:', error);
      }

    } else if (data.action === 'heartbeat') {
      // Update session with heartbeat
      const timeOnPage = data.time_on_page_seconds || 0;
      const isBounce = timeOnPage < 5;

      const update = {
        time_on_page_seconds: timeOnPage,
        max_scroll_depth: data.max_scroll_depth || 0,
        is_bounce: isBounce,
        last_heartbeat: now,
      };

      const response = await fetch(
        `${supabaseUrl}/rest/v1/lp_session_tracking?session_id=eq.${encodeURIComponent(data.session_id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(update),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('[LP Session] Heartbeat error:', error);
      }

    } else if (data.action === 'form_open') {
      // Track form open
      const update = {
        form_opened: true,
        form_opened_at: now,
        last_heartbeat: now,
      };

      await fetch(
        `${supabaseUrl}/rest/v1/lp_session_tracking?session_id=eq.${encodeURIComponent(data.session_id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(update),
        }
      );

    } else if (data.action === 'form_submit') {
      // Track form submit
      const update = {
        form_submitted: true,
        form_submitted_at: now,
        last_heartbeat: now,
      };

      await fetch(
        `${supabaseUrl}/rest/v1/lp_session_tracking?session_id=eq.${encodeURIComponent(data.session_id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(update),
        }
      );

    } else if (data.action === 'end') {
      // End session
      const timeOnPage = data.time_on_page_seconds || 0;
      const isBounce = timeOnPage < 5;

      const update = {
        time_on_page_seconds: timeOnPage,
        max_scroll_depth: data.max_scroll_depth || 0,
        is_bounce: isBounce,
        session_end: now,
        last_heartbeat: now,
      };

      await fetch(
        `${supabaseUrl}/rest/v1/lp_session_tracking?session_id=eq.${encodeURIComponent(data.session_id)}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(update),
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LP Session] Error:', error);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ status: 'ok', message: 'LP Session Tracking API' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
