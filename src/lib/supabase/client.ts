import { createClient } from '@supabase/supabase-js';

// Supabase Marketing DB (ouqhysemcldamthpuqqq)
// Enthält: blog_posts, leads, page_views, mastermind_applications
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://ouqhysemcldamthpuqqq.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our tables
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published_at: string;
  author: string;
  image_url: string;
  tags: string[];
}

export interface Lead {
  id?: string;
  email: string;
  name: string;
  company?: string;
  message?: string;
  source: string;
  created_at?: string;
}

export interface PageView {
  id?: string;
  page: string;
  referrer?: string;
  user_agent?: string;
  created_at?: string;
}

export interface MastermindApplication {
  id?: string;
  name: string;
  email: string;
  company: string;
  revenue?: string;
  goals?: string;
  created_at?: string;
}
