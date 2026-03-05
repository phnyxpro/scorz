import { useLocation, Link, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  competitions: "Competitions",
  register: "Register",
  score: "Judge Scoring",
  "chief-judge": "Chief Judge Dashboard",
  tabulator: "Tabulator Dashboard",
  witness: "Witness Dashboard",
  results: "Results",
  vote: "People's Choice",
  admin: "Admin",
  profile: "Profile",
  judging: "Judging Hub",
  "judge-dashboard": "Judge Dashboard",
  "master-sheet": "Master Sheet",
  "level-sheet": "Level Sheet",
  "rules-rubric": "Rules & Rubric",
  contestants: "Contestants",
  pricing: "Pricing",
};

function ResolvedCrumb({ id, fallback }: { id: string; fallback: string }) {
  const { data: name } = useQuery({
    queryKey: ["breadcrumb-resolve", id],
    staleTime: 1000 * 60 * 10, // 10 mins
    queryFn: async () => {
      // Check competitions
      const { data: comp } = await supabase.from("competitions").select("name").eq("id", id).maybeSingle();
      if (comp) return comp.name;

      // Check sub_events
      const { data: se } = await supabase.from("sub_events").select("name").eq("id", id).maybeSingle();
      if (se) return se.name;

      // Check competition_levels
      const { data: level } = await supabase.from("competition_levels").select("name").eq("id", id).maybeSingle();
      if (level) return level.name;

      return null;
    },
  });

  return <span>{name || fallback}</span>;
}

export function PageBreadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return null;

  const crumbs: { label: string | React.ReactNode; path: string; isId?: boolean }[] = [];
  let currentPath = "";

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    if (isUuid) {
      crumbs.push({
        label: <ResolvedCrumb id={segment} fallback={segment.slice(0, 8) + "..."} />,
        path: currentPath,
        isId: true
      });
      continue;
    }

    const label = ROUTE_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: currentPath });
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={crumb.path} className="contents">
              <BreadcrumbSeparator className="opacity-40" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-bold text-foreground">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path} className="text-muted-foreground hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

