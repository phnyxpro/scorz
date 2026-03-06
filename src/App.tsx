import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import PublicEvents from "./pages/PublicEvents";
import PublicEventDetail from "./pages/PublicEventDetail";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AudienceEvents from "./pages/AudienceEvents";
import MyTickets from "./pages/MyTickets";
import Competitions from "./pages/Competitions";
import CompetitionContestants from "./pages/CompetitionContestants";
import CompetitionDetail from "./pages/CompetitionDetail";
import ContestantRegistration from "./pages/ContestantRegistration";
import JudgeScoring from "./pages/JudgeScoring";
import JudgingHub from "./pages/JudgingHub";
import ChiefJudgeDashboard from "./pages/ChiefJudgeDashboard";
import TabulatorDashboard from "./pages/TabulatorDashboard";

import Results from "./pages/Results";
import PostEventPortal from "./pages/PostEventPortal";
import AudienceVoting from "./pages/AudienceVoting";
import ContestantProfile from "./pages/ContestantProfile";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";
import AdminBilling from "./pages/AdminBilling";
import MasterScoreSheet from "./pages/MasterScoreSheet";
import LevelMasterSheet from "./pages/LevelMasterSheet";
import JudgeDashboard from "./pages/JudgeDashboard";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import RulesAndRubric from "./pages/RulesAndRubric";
import RulesPage from "./pages/RulesPage";
import RubricPage from "./pages/RubricPage";
import PenaltiesPage from "./pages/PenaltiesPage";
import Settings from "./pages/Settings";
import FinanceDashboard from "./pages/FinanceDashboard";
import PeoplesChoiceManager from "./pages/PeoplesChoiceManager";
import RegistrationsHub from "./pages/RegistrationsHub";
import ContestantProfilesHub from "./pages/ContestantProfilesHub";
import ResultsHub from "./pages/ResultsHub";
import CheckInHub from "./pages/CheckInHub";
import TicketsHub from "./pages/TicketsHub";
import UpdatesHub from "./pages/UpdatesHub";
import ContestantFeedback from "./pages/ContestantFeedback";
import MagicLinkLanding from "./pages/MagicLinkLanding";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/public-events" element={<PublicEvents />} />
              <Route path="/events/:id" element={<PublicEventDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/about" element={<About />} />
              <Route path="/welcome" element={<MagicLinkLanding />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audience-events"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AudienceEvents />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-tickets"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MyTickets />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/judging"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JudgingHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/judge-dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JudgeDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Competitions />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CompetitionDetail />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/register"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContestantRegistration />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/score"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <JudgeScoring />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/chief-judge"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ChiefJudgeDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/tabulator"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TabulatorDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/results"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Results />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/post-event"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PostEventPortal />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/vote"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AudienceVoting />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContestantProfile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Settings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <FinanceDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/peoples-choice"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PeoplesChoiceManager />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContestantProfile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminUsers />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminSettings />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/billing"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminBilling />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/master-sheet"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MasterScoreSheet />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/level-sheet"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <LevelMasterSheet />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/rules-rubric"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RulesAndRubric />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/rules"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RulesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/rubric"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RubricPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/penalties"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PenaltiesPage />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitions/:id/contestants"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CompetitionContestants />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chief-judge"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Competitions />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tabulator"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Competitions />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/registrations"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <RegistrationsHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contestant-profiles"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContestantProfilesHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/results-hub"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ResultsHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets-hub"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <TicketsHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/updates"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <UpdatesHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/check-in"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CheckInHub />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feedback"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ContestantFeedback />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
