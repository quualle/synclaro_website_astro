import type { APIRoute } from 'astro';

export const prerender = false;

const WEBHOOK_URL = 'https://quualle.app.n8n.cloud/webhook/7db9cded-9fef-4e36-a3c5-75c46739789f';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Forward the request to the n8n webhook (fire and forget, don't block on errors)
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // Log error but don't fail the request - webhook might be inactive
        console.warn('[LP Webhook Proxy] Webhook returned non-OK status:', response.status);
      }
    } catch (webhookError) {
      // Log but don't fail - webhook service might be down
      console.warn('[LP Webhook Proxy] Webhook call failed:', webhookError);
    }

    // Always return success to client - tracking data is also sent to Supabase
    // The webhook is just a notification, not critical
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[LP Webhook Proxy] Error parsing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
