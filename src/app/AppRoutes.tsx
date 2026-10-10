import { Route } from "@solidjs/router";
import { lazy, Suspense, ParentProps } from "solid-js";
import SubjectsPage from "../features/shared/pages/SubjectsPage";
import Login from "../features/shared/pages/Login";
import AuthCallback from "../features/shared/components/auth/AuthCallback";
import NotFound from "../features/shared/pages/NotFound";
import AdminGate from "../features/dashboard/components/AdminGate";
import SuperAdminGate from "../features/dashboard/components/SuperAdminGate";
import AuthGate from "@/features/shared/components/AuthGate";

// Lazy Components
const Dashboard = lazy(() => import("../features/dashboard/pages/Dashboard"));
const QuizEditor = lazy(() => import("../features/quizzes/pages/QuizEditor"));
const LectureEditor = lazy(() => import("../features/dashboard/pages/LectureEditor"));
const ManageSubjects = lazy(() => import("../features/dashboard/pages/ManageSubjects"));
const ManageSections = lazy(() => import("../features/dashboard/pages/ManageSections"));
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

// PrintPage used to be imported eagerly. It pulls in tiptap + every editor
// extension + mermaid, so ALL of that was downloaded and executed on every
// app start just to support the rarely used /print route.
const PrintPage = lazy(() => import("../features/lectures/pages/PrintPage"));

// Landing is only for signed-out visitors; returning users never need it.
// It's a public route (outside ProtectedLayout's Suspense), so it brings its own.
const LandingLazy = lazy(() => import("@/features/shared/pages/Landing"));
function LandingRoute() {
  return (
    <Suspense fallback={null}>
      <LandingLazy />
    </Suspense>
  );
}

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
      <Route path="/landing" component={LandingRoute} />
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
          {/* Super-admin only: manage subjects and sections */}
          <Route path="/manage" component={SuperAdminGate}>
            <Route path="/" component={ManageSubjects} />
            <Route path="/:subject" component={ManageSections} />
          </Route>
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