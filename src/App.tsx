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
import AdminPanel from "./pages/AdminPanel";
import MasterScoreSheet from "./pages/MasterScoreSheet";
import LevelMasterSheet from "./pages/LevelMasterSheet";
import JudgeDashboard from "./pages/JudgeDashboard";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import RulesAndRubric from "./pages/RulesAndRubric";
import Settings from "./pages/Settings";
import FinanceDashboard from "./pages/FinanceDashboard";
import PeoplesChoiceManager from "./pages/PeoplesChoiceManager";

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
                path="/competitions/:id/witness"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <WitnessDashboard />
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
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <AdminPanel />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
