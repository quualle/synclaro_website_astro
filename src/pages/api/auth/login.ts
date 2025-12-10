import type { APIRoute } from 'astro';

export const prerender = false;

// Demo credentials for testing
const DEMO_CREDENTIALS = {
  email: 'demo@synclaro.de',
  password: 'demo123'
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'E-Mail und Passwort sind erforderlich.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Demo authentication - in production, this would use Supabase Auth
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      // Set session cookie (valid for 24 hours)
      cookies.set('academy_session', JSON.stringify({
        user: {
          email: email,
          name: 'Demo User',
          logged_in_at: new Date().toISOString()
        }
      }), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 hours
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Login erfolgreich!'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Invalid credentials
    return new Response(JSON.stringify({
      success: false,
      error: 'Ungültige E-Mail oder Passwort.'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
