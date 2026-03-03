import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  competitions: "Competitions",
  register: "Register",
  score: "Judge Scoring",
  "chief-judge": "Chief Judge",
  tabulator: "Tabulator",
  witness: "Witness",
  results: "Results",
  vote: "People's Choice",
  admin: "Admin Panel",
  profile: "Profile",
  judging: "Judging Hub",
  "judge-dashboard": "Judge Dashboard",
  "master-sheet": "Master Sheet",
  "level-sheet": "Level Sheet",
  "rules-rubric": "Rules & Rubric",
  contestants: "Contestants",
  pricing: "Pricing",
};

export function PageBreadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return null;

  // Build breadcrumb items, skipping UUID-like segments but keeping their path
  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";

  for (const segment of pathSegments) {
    currentPath += `/${segment}`;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    if (isUuid) {
      // Don't add a crumb for UUIDs, but keep path building
      continue;
    }

    const label = ROUTE_LABELS[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: currentPath });
  }

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <span key={crumb.path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
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

