import type { APIRoute } from 'astro';

/**
 * API Endpoint for Page View Tracking
 *
 * Receives tracking data from UserBehaviorTracker and logs it.
 * In production, this would write to a database or analytics service.
 *
 * Note: The page_views table doesn't exist in the current Supabase setup,
 * so we gracefully handle this by just logging the data.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Log tracking data (in production, this would go to a database)
    console.log('[Track API] Page view:', {
      page: data.page,
      referrer: data.referrer,
      utm_source: data.utm_source,
      timestamp: data.timestamp,
    });

    // For now, just return success
    // In production with page_views table:
    // await supabase.from('page_views').insert({
    //   page: data.page,
    //   referrer: data.referrer,
    //   user_agent: data.user_agent,
    // });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Page view tracked',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Track API] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to track page view',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

// Also handle GET requests for testing
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Tracking API is running',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
};
