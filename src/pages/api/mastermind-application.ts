import type { APIRoute } from 'astro';

export const prerender = false;

interface MastermindApplicationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  currentChallenges: string;
  goals: string;
  seminarDate?: string;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data: MastermindApplicationFormData = await request.json();

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

    if (!data.company) {
      return new Response(
        JSON.stringify({ error: 'Unternehmen ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get environment variables
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert into mastermind_applications table
    const applicationPayload = {
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      position: data.position,
      motivation: data.currentChallenges, // Map currentChallenges to motivation
      current_challenges: data.currentChallenges,
      goals: data.goals,
      seminar_date: data.seminarDate || null,
      status: 'pending',
      metadata: {},
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/mastermind_applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(applicationPayload),
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
