import { Link, useParams, Navigate } from "react-router-dom";
import { BookOpen, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getArticlesByCategory, getCategoryBySlug } from "@/content/help-articles";

export default function HelpCategory() {
  const { category } = useParams<{ category: string }>();
  const cat = category ? getCategoryBySlug(category) : undefined;
  const articles = category ? getArticlesByCategory(category) : [];

  if (!cat) return <Navigate to="/help" replace />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/help" className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-semibold text-sm">Knowledge Base</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Scorz
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/help" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> All categories
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">{cat.label}</h1>
        <p className="text-sm text-muted-foreground mb-8">{cat.description}</p>

        <div className="space-y-3">
          {articles.map((article, i) => (
            <Link
              key={article.slug}
              to={`/help/${category}/${article.slug}`}
              className="block"
            >
              <Card className="hover:border-accent/50 transition-colors group">
                <CardHeader className="py-4 flex-row items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{article.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{article.excerpt}</CardDescription>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {articles.length === 0 && (
          <p className="text-sm text-muted-foreground">No articles in this category yet.</p>
        )}
      </section>
    </div>
  );
}
