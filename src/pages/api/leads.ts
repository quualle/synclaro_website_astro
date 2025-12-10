import type { APIRoute } from 'astro';

export const prerender = false;

interface LeadData {
  name: string;
  email: string;
  company?: string;
  message?: string;
  phone?: string;
  campaign?: string;
  from_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: LeadData = await request.json();

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

    // Prepare lead data for lp_leads table
    const leadPayload = {
      name: data.name,
      email: data.email,
      company: data.company || null,
      phone: data.phone || null,
      campaign: data.campaign || 'kontakt',
      from_page: data.from_page || '/kontakt',
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
    };

    // Insert into lp_leads table (has company field and allows inserts with service key)
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
        JSON.stringify({ error: 'Fehler beim Speichern der Anfrage' }),
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
