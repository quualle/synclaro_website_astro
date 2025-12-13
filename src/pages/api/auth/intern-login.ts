import type { APIRoute } from 'astro';

export const prerender = false;

// Simple password for intern access - change this to a secure password
const INTERN_PASSWORD = process.env.INTERN_PASSWORD || 'synclaro2024';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === INTERN_PASSWORD) {
      // Set session cookie (24 hours)
      cookies.set('intern_session', JSON.stringify({
        authenticated: true,
        logged_in_at: new Date().toISOString()
      }), {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
