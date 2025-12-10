import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Delete session cookie
  cookies.delete('academy_session', {
    path: '/'
  });

  return new Response(JSON.stringify({
    success: true,
    message: 'Erfolgreich ausgeloggt.'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Delete session cookie
  cookies.delete('academy_session', {
    path: '/'
  });

  // Redirect to login page
  return redirect('/academy/login');
};
