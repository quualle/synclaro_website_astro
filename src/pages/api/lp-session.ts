import type { APIRoute } from 'astro';

export const prerender = false;

interface SessionPayload {
  action: 'create' | 'heartbeat' | 'form_open' | 'form_submit' | 'end' | 'cta_click' | 'modal_rendered' | 'first_interaction' | 'client_error' | 'modal_timeout';
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
  // Forensic tracking fields
  viewport_height?: number;
  modal_height?: number;
  first_visible_field_y?: number;
  modal_render_time_ms?: number;
  error_message?: string;
  error_type?: string;
  interaction_type?: string; // 'field_focus' | 'field_change' | 'tap' | 'selection'
  // A/B Test
  form_variant?: 'v1' | 'v2_short';
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

    // ============================================
    // FORENSIC TRACKING ACTIONS (P0)
    // ============================================

    } else if (data.action === 'cta_click') {
      // Track CTA button click (BEFORE modal renders)
      const update = {
        cta_clicked_at: now,
        viewport_height: data.viewport_height || null,
        form_variant: data.form_variant || 'v1',
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
      console.log(`[LP Session] cta_click: session=${data.session_id}`);

    } else if (data.action === 'modal_rendered') {
      // Track when modal is actually visible and interactable
      const update = {
        modal_rendered_at: now,
        form_opened: true,
        form_opened_at: now,
        modal_render_time_ms: data.modal_render_time_ms || null,
        modal_height: data.modal_height || null,
        first_visible_field_y: data.first_visible_field_y || null,
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
      console.log(`[LP Session] modal_rendered: session=${data.session_id}, render_time=${data.modal_render_time_ms}ms`);

    } else if (data.action === 'first_interaction') {
      // Track first real user interaction in modal
      const update = {
        first_interaction_at: now,
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
      console.log(`[LP Session] first_interaction: session=${data.session_id}, type=${data.interaction_type}`);

    } else if (data.action === 'client_error') {
      // Track JS errors during modal open
      const update = {
        has_client_error: true,
        client_error_message: data.error_message ? data.error_message.substring(0, 500) : null,
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
      console.log(`[LP Session] client_error: session=${data.session_id}, error=${data.error_message}`);

    } else if (data.action === 'modal_timeout') {
      // Track when modal didn't render within 2000ms
      const update = {
        has_client_error: true,
        client_error_message: 'form_open_timeout: Modal did not render within 2000ms',
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
      console.log(`[LP Session] modal_timeout: session=${data.session_id}`);
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
