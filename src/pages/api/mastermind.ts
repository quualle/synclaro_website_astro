import type { APIRoute } from 'astro';

export const prerender = false;

interface MastermindApplicationData {
  name: string;
  email: string;
  company: string;
  revenue: string;
  goals: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: MastermindApplicationData = await request.json();

    // Validation
    if (!data.email) {
      return new Response(
        JSON.stringify({ error: 'Email ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.name) {
      return new Response(
        JSON.stringify({ error: 'Name ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.company) {
      return new Response(
        JSON.stringify({ error: 'Unternehmen ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.revenue) {
      return new Response(
        JSON.stringify({ error: 'Jahresumsatz ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.goals) {
      return new Response(
        JSON.stringify({ error: 'Ziele sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables - service role key for server-side operations
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store mastermind application in lp_leads table with campaign identifier
    // The goals and revenue are stored in a combined message format
    const leadPayload = {
      name: data.name,
      email: data.email,
      company: data.company,
      phone: null,
      campaign: 'mastermind_application',
      from_page: '/mastermind',
      // Store revenue and goals as metadata in a structured format
      // Since lp_leads doesn't have dedicated fields for this, we use available fields creatively
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || `revenue:${data.revenue}`,  // Store revenue in utm_campaign
      utm_content: data.goals?.substring(0, 500) || null,  // Store goals in utm_content (truncated)
      utm_term: data.utm_term || null,
    };

    // Insert into lp_leads table (bypasses RLS with service role key)
    const response = await fetch(`${supabaseUrl}/rest/v1/lp_leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(leadPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Speichern der Bewerbung' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, id: result[0]?.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: 'Ein Fehler ist aufgetreten' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
