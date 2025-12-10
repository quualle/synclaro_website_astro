import { useState, useEffect } from 'react';

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  featured_image?: string;
  author: string;
  published_at: string | null;
  created_at: string;
  reading_time: number;
  tags: string[];
  topic: string;
  category: string;
  status: string;
  word_count: number;
}

interface BlogResponse {
  articles: BlogArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Fallback sample articles when database is not available
const SAMPLE_ARTICLES: BlogArticle[] = [
  {
    id: '1',
    title: 'KI-Integration im Mittelstand: Ein Praxisleitfaden',
    slug: 'ki-integration-mittelstand-praxisleitfaden',
    excerpt: 'Erfahren Sie, wie Sie KI erfolgreich in Ihrem mittelständischen Unternehmen integrieren können. Praxisnahe Tipps und konkrete Handlungsempfehlungen.',
    meta_description: 'Umfassender Leitfaden zur KI-Integration im Mittelstand mit praktischen Tipps und Strategien.',
    author: 'Marco Heer',
    published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    reading_time: 8,
    tags: ['KI', 'Mittelstand', 'Digitalisierung', 'Automatisierung'],
    topic: 'KI-Strategie',
    category: 'KI & Automatisierung',
    status: 'published',
    word_count: 1200
  },
  {
    id: '2',
    title: 'Workflow-Automatisierung: 5 Prozesse, die Sie sofort automatisieren sollten',
    slug: 'workflow-automatisierung-5-prozesse',
    excerpt: 'Entdecken Sie die 5 wichtigsten Prozesse, die Sie in Ihrem Unternehmen sofort automatisieren können, um Zeit und Ressourcen zu sparen.',
    meta_description: 'Die 5 besten Prozesse für Workflow-Automatisierung in Unternehmen.',
    author: 'Marco Heer',
    published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    reading_time: 6,
    tags: ['Automatisierung', 'Workflow', 'Effizienz', 'Prozessoptimierung'],
    topic: 'Automatisierung',
    category: 'Workflow-Automatisierung',
    status: 'published',
    word_count: 950
  },
  {
    id: '3',
    title: 'Company GPT: Der interne KI-Assistent für Ihr Unternehmenswissen',
    slug: 'company-gpt-interner-ki-assistent',
    excerpt: 'Wie ein Company GPT Ihr Unternehmenswissen für alle Mitarbeiter zugänglich macht und die Produktivität steigert.',
    meta_description: 'Company GPT als interner KI-Assistent für Unternehmen.',
    author: 'Marco Heer',
    published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    reading_time: 7,
    tags: ['Company GPT', 'Wissensmanagement', 'KI-Assistent', 'Produktivität'],
    topic: 'KI-Produkte',
    category: 'Company GPT',
    status: 'published',
    word_count: 850
  }
];

export default function BlogOverview() {
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  });

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'published',
        page: currentPage.toString(),
        limit: '9'
      });

      if (search) params.append('search', search);

      const response = await fetch(`/api/blog/articles?${params}`);
      const data: BlogResponse = await response.json();

      // Check if there's an error or no articles
      if (!response.ok || data.error || !data.articles || data.articles.length === 0) {
        // Use sample data as fallback
        const filteredSamples = search
          ? SAMPLE_ARTICLES.filter(a =>
              a.title.toLowerCase().includes(search.toLowerCase()) ||
              a.excerpt.toLowerCase().includes(search.toLowerCase())
            )
          : SAMPLE_ARTICLES;

        setArticles(filteredSamples);
        setPagination({
          page: 1,
          limit: 9,
          total: filteredSamples.length,
          totalPages: 1
        });
        setUsingSampleData(true);
      } else {
        setArticles(data.articles);
        setPagination(data.pagination);
        setUsingSampleData(false);
      }

    } catch (err) {
      // On any error, use sample data
      setArticles(SAMPLE_ARTICLES);
      setPagination({
        page: 1,
        limit: 9,
        total: SAMPLE_ARTICLES.length,
        totalPages: 1
      });
      setUsingSampleData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      fetchArticles();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Search */}
      <div className="mb-12">
        <div className="relative max-w-md">
          <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Artikel durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border-2 border-black focus:outline-none focus:ring-2 focus:ring-swiss-orange focus:border-swiss-orange transition-all font-medium"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-24">
          <div className="inline-block animate-spin w-12 h-12 border-4 border-black border-t-swiss-orange"></div>
          <p className="text-gray-600 mt-6 font-medium">Artikel werden geladen...</p>
        </div>
      )}

      {/* Sample Data Notice */}
      {usingSampleData && !loading && (
        <div className="mb-8 p-4 bg-gray-100 border-l-4 border-swiss-orange">
          <p className="text-gray-600 text-sm">
            <span className="font-bold">Hinweis:</span> Es werden Beispielartikel angezeigt. Blog-Inhalte werden bald verfügbar sein.
          </p>
        </div>
      )}

      {/* Articles Grid */}
      {!loading && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group"
            >
              <a href={`/blog/${article.slug}`}>
                <div className="h-full border border-black/10 hover:border-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 bg-white">
                  {/* Featured Image Placeholder */}
                  <div className="w-full h-48 bg-gray-100 overflow-hidden">
                    {article.featured_image ? (
                      <img
                        src={article.featured_image}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <span className="text-4xl">📝</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    {/* Article meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(article.published_at || article.created_at)}</span>
                      </div>
                      {article.reading_time && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{article.reading_time} Min.</span>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-black mb-3 group-hover:text-swiss-orange transition-colors">
                      {article.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {article.excerpt || article.meta_description}
                    </p>

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-xs text-gray-600 font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 font-medium">
                            +{article.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Read more */}
                    <div className="flex items-center text-swiss-orange font-bold group-hover:translate-x-2 transition-transform">
                      <span>Artikel lesen</span>
                      <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && articles.length === 0 && (
        <div className="text-center py-24">
          <p className="text-gray-600 text-xl font-medium mb-4">Keine Artikel gefunden.</p>
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="px-8 py-4 bg-swiss-orange text-white font-bold hover:bg-black transition-colors"
            >
              Suche zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-16">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-6 py-3 bg-black text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-swiss-orange transition-colors"
          >
            Vorherige
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-12 h-12 font-bold transition-colors ${
                    isActive
                      ? 'bg-swiss-orange text-white'
                      : 'bg-gray-100 text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
            disabled={currentPage === pagination.totalPages}
            className="px-6 py-3 bg-black text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-swiss-orange transition-colors"
          >
            Nächste
          </button>
        </div>
      )}
    </div>
  );
}
