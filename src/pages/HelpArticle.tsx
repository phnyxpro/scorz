import { Link, useParams, Navigate } from "react-router-dom";
import { BookOpen, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getArticle, getArticlesByCategory, getCategoryBySlug } from "@/content/help-articles";
import { markdownToHtml, renderVideoEmbed } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";

export default function HelpArticle() {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const cat = category ? getCategoryBySlug(category) : undefined;
  const article = category && slug ? getArticle(category, slug) : undefined;
  const siblings = category ? getArticlesByCategory(category) : [];

  if (!cat || !article) return <Navigate to={category ? `/help/${category}` : "/help"} replace />;

  const currentIdx = siblings.findIndex((a) => a.slug === slug);
  const prev = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const next = currentIdx < siblings.length - 1 ? siblings[currentIdx + 1] : null;

  const contentHtml = markdownToHtml(article.content);
  const videoHtml = renderVideoEmbed(article.video);

  // Prepare SEO data
  const articleTitle = `${article.title} | Scorz Help`;
  const articleDescription = article.excerpt;
  const canonicalUrl = `${window.location.origin}/help/${category}/${slug}`;

  // FAQ Schema for knowledge base
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": {
      "@type": "Question",
      "name": article.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": article.excerpt
      }
    }
  };

  return (
    <>
      <SEO
        title={articleTitle}
        description={articleDescription}
        canonical={canonicalUrl}
        structuredData={faqStructuredData}
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/help" className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-semibold text-sm hidden sm:inline">Knowledge Base</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link to="/help" className="hover:text-foreground transition-colors">Help</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to={`/help/${category}`} className="hover:text-foreground transition-colors">{cat.label}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground truncate max-w-[150px]">{article.title}</span>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <Link to={`/help/${category}`} className="text-sm font-semibold text-foreground mb-3 block">
              {cat.label}
            </Link>
            <nav className="space-y-0.5">
              {siblings.map((a) => (
                <Link
                  key={a.slug}
                  to={`/help/${category}/${a.slug}`}
                  className={cn(
                    "block text-xs py-1.5 px-2 rounded transition-colors",
                    a.slug === slug
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {a.title}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 max-w-3xl">
          <Badge variant="secondary" className="text-[10px] mb-3">{article.category}</Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{article.title}</h1>
          <p className="text-sm text-muted-foreground mb-6">{article.excerpt}</p>

          {/* Video section */}
          <div dangerouslySetInnerHTML={{ __html: videoHtml }} />

          {/* Article body */}
          <div
            className="help-article-content"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Prev / Next nav */}
          <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
            {prev ? (
              <Link
                to={`/help/${category}/${prev.slug}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider">Previous</div>
                  <div className="font-medium text-foreground">{prev.title}</div>
                </div>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                to={`/help/${category}/${next.slug}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-wider">Next</div>
                  <div className="font-medium text-foreground">{next.title}</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : <div />}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>Can't find what you're looking for? Contact us at dev@phnyx.pro</p>
      </footer>
      </div>
    </>
  );
}
