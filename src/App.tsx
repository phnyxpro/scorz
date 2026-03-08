import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { UpdateNotice } from "@/components/shared/UpdateNotice";

// Eagerly loaded (public entry points)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const PublicEvents = lazy(() => import("./pages/PublicEvents"));
const PublicEventDetail = lazy(() => import("./pages/PublicEventDetail"));
const About = lazy(() => import("./pages/About"));
const MagicLinkLanding = lazy(() => import("./pages/MagicLinkLanding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AudienceEvents = lazy(() => import("./pages/AudienceEvents"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const Competitions = lazy(() => import("./pages/Competitions"));
const CompetitionContestants = lazy(() => import("./pages/CompetitionContestants"));
const CompetitionDetail = lazy(() => import("./pages/CompetitionDetail"));
const ContestantRegistration = lazy(() => import("./pages/ContestantRegistration"));
const JudgeScoring = lazy(() => import("./pages/JudgeScoring"));
const JudgingHub = lazy(() => import("./pages/JudgingHub"));
const ChiefJudgeDashboard = lazy(() => import("./pages/ChiefJudgeDashboard"));
const TabulatorDashboard = lazy(() => import("./pages/TabulatorDashboard"));
const Results = lazy(() => import("./pages/Results"));
const PostEventPortal = lazy(() => import("./pages/PostEventPortal"));
const AudienceVoting = lazy(() => import("./pages/AudienceVoting"));
const ContestantProfile = lazy(() => import("./pages/ContestantProfile"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminBilling = lazy(() => import("./pages/AdminBilling"));
const AdminLogs = lazy(() => import("./pages/AdminLogs"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const MasterScoreSheet = lazy(() => import("./pages/MasterScoreSheet"));
const LevelMasterSheet = lazy(() => import("./pages/LevelMasterSheet"));
const JudgeDashboard = lazy(() => import("./pages/JudgeDashboard"));
const RulesAndRubric = lazy(() => import("./pages/RulesAndRubric"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const RubricPage = lazy(() => import("./pages/RubricPage"));
const PenaltiesPage = lazy(() => import("./pages/PenaltiesPage"));
const Settings = lazy(() => import("./pages/Settings"));
const FinanceDashboard = lazy(() => import("./pages/FinanceDashboard"));
const PeoplesChoiceManager = lazy(() => import("./pages/PeoplesChoiceManager"));
const RegistrationsHub = lazy(() => import("./pages/RegistrationsHub"));
const ContestantProfilesHub = lazy(() => import("./pages/ContestantProfilesHub"));
const ResultsHub = lazy(() => import("./pages/ResultsHub"));
const CheckInHub = lazy(() => import("./pages/CheckInHub"));
const TicketsHub = lazy(() => import("./pages/TicketsHub"));
const UpdatesHub = lazy(() => import("./pages/UpdatesHub"));
const ContestantFeedback = lazy(() => import("./pages/ContestantFeedback"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const ApiKeysPage = lazy(() => import("./pages/ApiKeysPage"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const HelpCategory = lazy(() => import("./pages/HelpCategory"));
const HelpArticle = lazy(() => import("./pages/HelpArticle"));
const CompetitionFormsPage = lazy(() => import("./pages/CompetitionFormsPage"));
const TicketSuccess = lazy(() => import("./pages/TicketSuccess"));
const WitnessDashboard = lazy(() => import("./pages/WitnessDashboard"));
const ContestantRegistrationProfile = lazy(() => import("./pages/ContestantRegistrationProfile"));
const ProductionAssistantDashboard = lazy(() => import("./pages/ProductionAssistantDashboard"));
const ScoreTablesPage = lazy(() => import("./pages/ScoreTablesPage"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <UpdateNotice />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/public-events" element={<PublicEvents />} />
                <Route path="/events/:id" element={<PublicEventDetail />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/help/:category" element={<HelpCategory />} />
                <Route path="/help/:category/:slug" element={<HelpArticle />} />
                <Route path="/welcome" element={<MagicLinkLanding />} />
                <Route path="/ticket-success" element={<TicketSuccess />} />
                <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
                <Route path="/audience-events" element={<ProtectedPage><AudienceEvents /></ProtectedPage>} />
                <Route path="/my-tickets" element={<ProtectedPage><MyTickets /></ProtectedPage>} />
                <Route path="/judging" element={<ProtectedPage><JudgingHub /></ProtectedPage>} />
                <Route path="/judge-dashboard" element={<ProtectedPage><JudgeDashboard /></ProtectedPage>} />
                <Route path="/competitions" element={<ProtectedPage><Competitions /></ProtectedPage>} />
                <Route path="/competitions/:id" element={<ProtectedPage><CompetitionDetail /></ProtectedPage>} />
                <Route path="/competitions/:id/forms" element={<ProtectedPage><CompetitionFormsPage /></ProtectedPage>} />
                <Route path="/competitions/:id/register" element={<ProtectedPage><ContestantRegistration /></ProtectedPage>} />
                <Route path="/competitions/:id/score" element={<ProtectedPage><JudgeScoring /></ProtectedPage>} />
                <Route path="/competitions/:id/chief-judge" element={<ProtectedPage><ChiefJudgeDashboard /></ProtectedPage>} />
                <Route path="/competitions/:id/tabulator" element={<ProtectedPage><TabulatorDashboard /></ProtectedPage>} />
                <Route path="/competitions/:id/results" element={<ProtectedPage><Results /></ProtectedPage>} />
                <Route path="/competitions/:id/post-event" element={<ProtectedPage><PostEventPortal /></ProtectedPage>} />
                <Route path="/competitions/:id/witness" element={<ProtectedPage><WitnessDashboard /></ProtectedPage>} />
                <Route path="/competitions/:id/contestant/:registrationId" element={<ProtectedPage><ContestantRegistrationProfile /></ProtectedPage>} />
                <Route path="/competitions/:id/vote" element={<ProtectedPage><AudienceVoting /></ProtectedPage>} />
                <Route path="/profile" element={<ProtectedPage><ContestantProfile /></ProtectedPage>} />
                <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
                <Route path="/finance" element={<ProtectedPage><FinanceDashboard /></ProtectedPage>} />
                <Route path="/peoples-choice" element={<ProtectedPage><PeoplesChoiceManager /></ProtectedPage>} />
                <Route path="/profile/:userId" element={<ProtectedPage><ContestantProfile /></ProtectedPage>} />
                <Route path="/admin/users" element={<ProtectedPage><AdminUsers /></ProtectedPage>} />
                <Route path="/admin/settings" element={<ProtectedPage><AdminSettings /></ProtectedPage>} />
                <Route path="/admin/billing" element={<ProtectedPage><AdminBilling /></ProtectedPage>} />
                <Route path="/admin/logs" element={<ProtectedPage><AdminLogs /></ProtectedPage>} />
                <Route path="/onboarding" element={<ProtectedPage><Onboarding /></ProtectedPage>} />
                <Route path="/competitions/:id/master-sheet" element={<ProtectedPage><MasterScoreSheet /></ProtectedPage>} />
                <Route path="/competitions/:id/level-sheet" element={<ProtectedPage><LevelMasterSheet /></ProtectedPage>} />
                <Route path="/competitions/:id/rules-rubric" element={<ProtectedPage><RulesAndRubric /></ProtectedPage>} />
                <Route path="/competitions/:id/rules" element={<ProtectedPage><RulesPage /></ProtectedPage>} />
                <Route path="/competitions/:id/rubric" element={<ProtectedPage><RubricPage /></ProtectedPage>} />
                <Route path="/competitions/:id/penalties" element={<ProtectedPage><PenaltiesPage /></ProtectedPage>} />
                <Route path="/competitions/:id/contestants" element={<ProtectedPage><CompetitionContestants /></ProtectedPage>} />
                <Route path="/chief-judge" element={<ProtectedPage><Competitions /></ProtectedPage>} />
                <Route path="/tabulator" element={<ProtectedPage><TabulatorDashboard /></ProtectedPage>} />
                <Route path="/registrations" element={<ProtectedPage><RegistrationsHub /></ProtectedPage>} />
                <Route path="/contestant-profiles" element={<ProtectedPage><ContestantProfilesHub /></ProtectedPage>} />
                <Route path="/results-hub" element={<ProtectedPage><ResultsHub /></ProtectedPage>} />
                <Route path="/tickets-hub" element={<ProtectedPage><TicketsHub /></ProtectedPage>} />
                <Route path="/updates" element={<ProtectedPage><UpdatesHub /></ProtectedPage>} />
                <Route path="/check-in" element={<ProtectedPage><CheckInHub /></ProtectedPage>} />
                <Route path="/feedback" element={<ProtectedPage><ContestantFeedback /></ProtectedPage>} />
                <Route path="/analytics" element={<ProtectedPage><AnalyticsDashboard /></ProtectedPage>} />
                <Route path="/api-keys" element={<ProtectedPage><ApiKeysPage /></ProtectedPage>} />
                <Route path="/production-assistant" element={<ProtectedPage><ProductionAssistantDashboard /></ProtectedPage>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
