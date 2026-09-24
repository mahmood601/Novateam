import { Route } from "@solidjs/router";
import { lazy, Suspense, ParentProps } from "solid-js";
import SubjectsPage from "../features/shared/pages/SubjectsPage";
import Login from "../features/shared/pages/Login";
import AuthCallback from "../features/shared/components/auth/AuthCallback";
import NotFound from "../features/shared/pages/NotFound";
import AdminGate from "../features/dashboard/components/AdminGate";
import PrintPage from "../features/lectures/pages/PrintPage";
import Landing from "@/features/shared/pages/Landing";
import AuthGate from "@/features/shared/components/AuthGate";

// Lazy Components
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

/**
 * غلاف يحمي المسارات ويحتوي على Suspense لجميع الصفحات المفتوحة كسستة Lazy
 */
function ProtectedLayout(props: ParentProps) {
  return (
    <AuthGate>
      <Suspense fallback={<div>جاري التحميل...</div>}>
        {props.children}
      </Suspense>
    </AuthGate>
  );
}

export default function AppRoutes() {
  return (
    <>
      {/* ========== صفحات عامة (بدون تسجيل) ========== */}
      <Route path="/landing" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/privacy" component={Privacy} />

      {/* ========== المسارات المحمية تحت غلاف موحد ========== */}
      <Route path="/" component={ProtectedLayout}>
        <Route path="/" component={SubjectsPage} />
        <Route path="/profile" component={Profile} />
        <Route path="/search" component={SearchPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/settings" component={Settings} />
        <Route path="/status" component={StatusPage} />

        <Route path="/:subject" component={SelectMenu} />
        <Route path="/:subject/weak" component={WeakQuestionsPage} />
        <Route path="/:subject/favorite" component={FavoritesPage} />
        <Route path="/:subject/lectures" component={LecturesListPage} />
        <Route path="/:subject/lectures/:seasonId" component={LectureViewPage} />
        <Route path="/:subject/quiz" component={Quiz} />
        <Route path="/:subject/:section" component={Quiz} />

        {/* مسارات الـ Dashboard */}
        <Route path="/dashboard" component={AdminGate}>
          <Route path="/" component={Dashboard} />
          <Route path="/:subject" component={SectionPicker} />
          <Route path="/:subject/edit-quiz" component={QuizEditor} />
          <Route path="/:subject/edit-lecture" component={LectureEditor} />
          <Route path="/:subject/edit-lecture/:season/editor" component={EditorPage} />
        </Route>

        <Route path="/print" component={PrintPage} />
      </Route>

      {/* Catch-all للمسارات غير الموجودة */}
      <Route path="*" component={NotFound} />
    </>
  );
}