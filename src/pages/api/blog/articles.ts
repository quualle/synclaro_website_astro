import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://ouqhysemcldamthpuqqq.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'published';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    // Order by date and paginate
    query = query
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: articles, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      articles: articles || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('API error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
