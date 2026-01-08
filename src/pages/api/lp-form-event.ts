import type { APIRoute } from 'astro';

export const prerender = false;

interface FormEventPayload {
  // Session Info
  session_id: string;
  visitor_id?: string;

  // Event Details
  event_type: 'step_enter' | 'step_exit' | 'step_complete' | 'field_focus' | 'field_blur' | 'field_change' | 'field_validation_error' | 'form_abandon' | 'form_submit';
  step_number?: number;
  step_name?: string;

  // Field Details
  field_name?: string;
  field_type?: string;
  field_filled?: boolean;
  field_value_length?: number;

  // Validation Error Details
  validation_error_field?: string;
  validation_error_type?: string;
  validation_error_message?: string;

  // Timing
  time_since_form_open_ms?: number;
  time_on_current_step_ms?: number;

  // Context
  device_type?: string;
  utm_source?: string;
  utm_medium?: string;

  // Form Version
  form_variant?: 'v1' | 'v2_short' | 'v3_single_page';

  // Summary Update (for session tracking table)
  update_session_summary?: boolean;
  form_max_step_reached?: number;
  form_step_1_completed?: boolean;
  form_step_2_completed?: boolean;
  form_step_3_completed?: boolean;
  form_abandonment_step?: number;
  form_time_step_1_ms?: number;
  form_time_step_2_ms?: number;
  form_time_step_3_ms?: number;
  form_total_time_ms?: number;
  form_fields_filled?: string[];
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: FormEventPayload = await request.json();

    const supabaseUrl = import.meta.env.CRM_SUPABASE_URL || 'https://xmlrqsyzmnuidjsxghco.supabase.co';
    const supabaseKey = import.meta.env.CRM_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[LP Form Event] Missing Supabase config');
      return new Response(JSON.stringify({ success: false, error: 'Missing config' }), { status: 500 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    };

    // 1. Insert detailed event into lp_form_events
    const eventRecord = {
      session_id: data.session_id,
      visitor_id: data.visitor_id || null,
      event_type: data.event_type,
      step_number: data.step_number || null,
      step_name: data.step_name || null,
      field_name: data.field_name || null,
      field_type: data.field_type || null,
      field_filled: data.field_filled || false,
      field_value_length: data.field_value_length || null,
      time_since_form_open_ms: data.time_since_form_open_ms || null,
      time_on_current_step_ms: data.time_on_current_step_ms || null,
      device_type: data.device_type || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      form_variant: data.form_variant || 'v1',
      // Validation Error Tracking
      validation_error_field: data.validation_error_field || null,
      validation_error_type: data.validation_error_type || null,
      validation_error_message: data.validation_error_message || null,
    };

    const eventResponse = await fetch(`${supabaseUrl}/rest/v1/lp_form_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(eventRecord),
    });

    if (!eventResponse.ok) {
      const error = await eventResponse.text();
      console.error('[LP Form Event] Insert error:', error);
    } else {
      console.log(`[LP Form Event] ${data.event_type}: step=${data.step_number}, field=${data.field_name || '-'}`);
    }

    // 2. Update session summary if requested (on step completion or abandon)
    if (data.update_session_summary && data.session_id) {
      const summaryUpdate: Record<string, any> = {};

      if (data.form_max_step_reached !== undefined) {
        summaryUpdate.form_max_step_reached = data.form_max_step_reached;
      }
      if (data.form_step_1_completed !== undefined) {
        summaryUpdate.form_step_1_completed = data.form_step_1_completed;
      }
      if (data.form_step_2_completed !== undefined) {
        summaryUpdate.form_step_2_completed = data.form_step_2_completed;
      }
      if (data.form_step_3_completed !== undefined) {
        summaryUpdate.form_step_3_completed = data.form_step_3_completed;
      }
      if (data.form_abandonment_step !== undefined) {
        summaryUpdate.form_abandonment_step = data.form_abandonment_step;
      }
      if (data.form_time_step_1_ms !== undefined) {
        summaryUpdate.form_time_step_1_ms = data.form_time_step_1_ms;
      }
      if (data.form_time_step_2_ms !== undefined) {
        summaryUpdate.form_time_step_2_ms = data.form_time_step_2_ms;
      }
      if (data.form_time_step_3_ms !== undefined) {
        summaryUpdate.form_time_step_3_ms = data.form_time_step_3_ms;
      }
      if (data.form_total_time_ms !== undefined) {
        summaryUpdate.form_total_time_ms = data.form_total_time_ms;
      }
      if (data.form_fields_filled !== undefined) {
        summaryUpdate.form_fields_filled = JSON.stringify(data.form_fields_filled);
      }

      if (Object.keys(summaryUpdate).length > 0) {
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/lp_session_tracking?session_id=eq.${encodeURIComponent(data.session_id)}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(summaryUpdate),
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          console.error('[LP Form Event] Session update error:', error);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LP Form Event] Error:', error);
    return new Response(JSON.stringify({ success: false }), {
      status: 200, // Return 200 to not break frontend
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ status: 'ok', message: 'LP Form Event Tracking API' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
