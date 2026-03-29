import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get all public competitions
    const { data: competitions, error } = await supabase
      .from('competitions')
      .select('id, slug, updated_at, status')
      .in('status', ['active', 'completed', 'draft'])
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Get all help articles
    const { data: articles, error: articlesError } = await supabase
      .from('help_articles')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })

    if (articlesError) throw articlesError

    const baseUrl = 'https://scorz.live'

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'weekly' },
      { url: '/events', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/help', priority: '0.8', changefreq: 'weekly' },
    ]

    // Dynamic competition pages
    const competitionPages = competitions.map(comp => ({
      url: `/events/${comp.slug || comp.id}`,
      priority: comp.status === 'active' ? '0.9' : '0.7',
      changefreq: comp.status === 'active' ? 'hourly' : 'weekly',
      lastmod: comp.updated_at
    }))

    // Help article pages
    const helpPages = articles.map(article => ({
      url: `/help/${article.slug}`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: article.updated_at
    }))

    const allPages = [...staticPages, ...competitionPages, ...helpPages]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    })

  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})