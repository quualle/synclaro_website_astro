import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Clear the session cookie
  cookies.delete('intern_session', { path: '/' });

  return redirect('/intern');
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  // Also support GET for simple link-based logout
  cookies.delete('intern_session', { path: '/' });

  return redirect('/intern');
};
