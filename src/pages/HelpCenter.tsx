import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen, Trophy, ClipboardList, BarChart3, User, Users, Rocket, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { helpCategories, helpArticles, type HelpCategory as HelpCategoryType } from "@/content/help-articles";

const iconMap: Record<string, React.ReactNode> = {
  Rocket: <Rocket className="h-6 w-6" />,
  Trophy: <Trophy className="h-6 w-6" />,
  ClipboardList: <ClipboardList className="h-6 w-6" />,
  BarChart3: <BarChart3 className="h-6 w-6" />,
  User: <User className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
};

export default function HelpCenter() {
  const [query, setQuery] = useState("");

  const filteredArticles = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return helpArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.excerpt.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
  }, [query]);

  const articleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    helpArticles.forEach((a) => {
      counts[a.categorySlug] = (counts[a.categorySlug] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-foreground/80 transition-colors">
            <img src="/logo.svg" alt="Scorz" className="h-7" />
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Scorz
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-8 w-8 text-accent" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Knowledge Base</h1>
          </div>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Everything you need to know about running, judging and participating in competitions on Scorz.
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Search results */}
      {query.trim() && (
        <section className="max-w-3xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground mb-4">
            {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""} for "{query}"
          </p>
          {filteredArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles found. Try a different search term.</p>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <Link
                  key={`${article.categorySlug}/${article.slug}`}
                  to={`/help/${article.categorySlug}/${article.slug}`}
                  className="block"
                >
                  <Card className="hover:border-accent/50 transition-colors">
                    <CardHeader className="py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{article.category}</Badge>
                      </div>
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription className="text-xs">{article.excerpt}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Category grid */}
      {!query.trim() && (
        <section className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {helpCategories.map((cat) => (
              <Link key={cat.slug} to={`/help/${cat.slug}`}>
                <Card className="h-full hover:border-accent/50 hover:shadow-md transition-all group cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-md bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                        {iconMap[cat.icon] || <BookOpen className="h-6 w-6" />}
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {articleCounts[cat.slug] || 0} articles
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{cat.label}</CardTitle>
                    <CardDescription className="text-xs">{cat.description}</CardDescription>
                    <div className="flex items-center gap-1 text-xs text-accent mt-2 group-hover:gap-2 transition-all">
                      Browse <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>Can't find what you're looking for? Contact us at dev@phnyx.pro</p>
      </footer>
    </div>
  );
}
