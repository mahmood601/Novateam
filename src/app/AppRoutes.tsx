import { Route } from "@solidjs/router";
import { lazy, Suspense } from "solid-js";
import SubjectsPage from "../features/shared/pages/SubjectsPage";
import Login from "../features/shared/pages/Login";
import AuthCallback from "../features/shared/components/auth/AuthCallback";
import NotFound from "../features/shared/pages/NotFound";
import AdminGate from "../features/dashboard/components/AdminGate";
import PrintPage from "../features/lectures/pages/PrintPage";

const Dashboard = lazy(() => import("../features/dashboard/pages/Dashboard"));
const QuizEditor = lazy(() => import("../features/quizzes/pages/QuizEditor"));
const LectureEditor = lazy(() => import("../features/dashboard/pages/LectureEditor"));
const SectionPicker = lazy(() => import("../features/dashboard/pages/SubjectHub"));
const EditorPage = lazy(() => import("../features/editor/pages/EditorPage"));

const SearchPage = lazy(() => import("../features/shared/pages/Search"));
const StatsPage = lazy(() => import("../features/shared/pages/Stats"));
const StatusPage = lazy(() => import("../features/shared/pages/Status"));
const Profile = lazy(() => import("../features/shared/pages/Profile"));
const Settings = lazy(() => import("../features/shared/pages/Settings"));
const SelectMenu = lazy(() => import("../features/shared/pages/SelectMenu"));
const Quiz = lazy(() => import("../features/quizzes/pages/Quiz"));
const FavoritesPage = lazy(() => import("../features/quizzes/pages/Favorites"));
const WeakQuestionsPage = lazy(() => import("../features/quizzes/pages/WeakQuestions"));
const Privacy = lazy(() => import("../features/shared/pages/Privacy"));
const LecturesListPage = lazy(() => import("../features/lectures/pages/LecturesListPage"));
const LectureViewPage = lazy(() => import("../features/lectures/pages/LectureViewPage"));

export default function AppRoutes() {
  return (
    <>
      <Route path="/" component={SubjectsPage} />
      <Route path="/profile" component={() => <Suspense><Profile /></Suspense>} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/login" component={Login} />
      <Route path="/search" component={() => <Suspense><SearchPage /></Suspense>} />
      <Route path="/stats" component={() => <Suspense><StatsPage /></Suspense>} />
      <Route path="/settings" component={() => <Suspense><Settings /></Suspense>} />
      <Route path="/status" component={() => <Suspense><StatusPage /></Suspense>} />
      <Route path="/privacy" component={() => <Suspense><Privacy /></Suspense>} />
      <Route path="/:subject" component={() => <Suspense><SelectMenu /></Suspense>} />
      <Route path="/:subject/weak" component={() => <Suspense><WeakQuestionsPage /></Suspense>} />
      <Route path="/:subject/favorite" component={() => <Suspense><FavoritesPage /></Suspense>} />
      <Route path="/:subject/lectures" component={() => <Suspense><LecturesListPage /></Suspense>} />
      <Route path="/:subject/lectures/:seasonId" component={() => <Suspense><LectureViewPage /></Suspense>} />
      {/* الدخول الافتراضي الجديد: بدون فلتر بالـ URL — كل الفصول + كل
          السنين، والفلترة كلها صارت داخل الكويز نفسه (شوف QuizFilterSheet).
          لازم تكون قبل الـ catch-all تحت عشان "quiz" ما تتفسّر كـ section. */}
      <Route path="/:subject/quiz" component={() => <Suspense><Quiz /></Suspense>} />
      {/* يبقى للتوافق الرجعي مع أي روابط قديمة محفوظة (season_id-N /
          year_id-N) — Quiz.tsx بيحوّلها لفلتر ابتدائي عبر filtersFromLegacySection. */}
      <Route path="/:subject/:section" component={() => <Suspense><Quiz /></Suspense>} />

      <Route path="/dashboard" /*component={AdminGate} */>
      <Route path="/" component={() => <Suspense><Dashboard /></Suspense>} />
      <Route path="/:subject" component={() => <Suspense><SectionPicker /></Suspense>} />
      <Route path="/:subject/edit-quiz" component={() => <Suspense><QuizEditor /></Suspense>} />
      <Route path="/:subject/edit-lecture" component={() => <Suspense><LectureEditor /></Suspense>} />
      <Route path="/:subject/edit-lecture/:season/editor" component={() => <Suspense><EditorPage /></Suspense>} />
      </Route>
      <Route path="/print" component={() => <Suspense><PrintPage /></Suspense>} />


      <Route path="*" component={NotFound} />
    </>
  );
}
