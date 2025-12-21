import type { APIRoute } from 'astro';

export const prerender = false;

interface LPApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string | null;
  position?: string | null;
  program: 'gruppen_coaching' | 'mastermind' | 'beide';
  questionnaireAnswers: Record<string, string>;
  motivation?: string | null;
}

const WEBHOOK_URL = 'https://quualle.app.n8n.cloud/webhook/7db9cded-9fef-4e36-a3c5-75c46739789f';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: LPApplicationFormData = await request.json();

    // Validation
    if (!data.email) {
      return new Response(
        JSON.stringify({ error: 'Email ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.firstName || !data.lastName) {
      return new Response(
        JSON.stringify({ error: 'Name ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.program) {
      return new Response(
        JSON.stringify({ error: 'Programm-Auswahl ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables - use anon key (RLS allows public inserts)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[LP Application API] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get session ID from sessionStorage (passed via cookie or header)
    const sessionId = request.headers.get('x-session-id') || null;

    // Get UTM parameters from request
    const utmSource = request.headers.get('x-utm-source') || null;
    const utmMedium = request.headers.get('x-utm-medium') || null;
    const utmCampaign = request.headers.get('x-utm-campaign') || null;

    // Insert into lp_coaching_applications table
    const applicationPayload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company || null,
      position: data.position || null,
      program_interest: data.program,
      questionnaire_answers: data.questionnaireAnswers || {},
      motivation: data.motivation || null,
      source: 'lp_coaching',
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      session_id: sessionId,
      status: 'pending',
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/lp_coaching_applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(applicationPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LP Application API] Supabase error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Bewerbung' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const applicationId = result[0]?.id;

    // Send webhook notification
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'application_submitted',
          application_id: applicationId,
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          position: data.position,
          program: data.program,
          questionnaire_answers: data.questionnaireAnswers,
          motivation: data.motivation,
          source: 'lp_coaching',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          timestamp: new Date().toISOString()
        })
      });
    } catch (webhookError) {
      // Log but don't fail the request if webhook fails
      console.error('[LP Application API] Webhook error:', webhookError);
    }

    return new Response(
      JSON.stringify({ success: true, id: applicationId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LP Application API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Ein Fehler ist aufgetreten' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
