import { Route } from "@solidjs/router";
import { lazy, Suspense } from "solid-js";
import SubjectsPage from "../pages/SubjectsPage";
import Login from "../pages/Login";
import AuthCallback from "./auth/AuthCallback";

// الصفحات الثقيلة — تُحمَّل عند الطلب فقط
const Dashboard = lazy(() => import("../pages/Dashboard"));
const SearchPage = lazy(() => import("../pages/Search"));
const StatsPage = lazy(() => import("../pages/Stats"));
const StatusPage = lazy(() => import("../pages/Status"));
const Profile = lazy(() => import("../pages/Profile"));
const Settings = lazy(() => import("../pages/Settings"));
const SelectMenu = lazy(() => import("../pages/SelectMenu"));
const Quiz = lazy(() => import("../pages/Quiz/Quiz"));
const FavoritesPage = lazy(() => import("../pages/Favorites"));
const WeakQuestionsPage = lazy(() => import("../pages/WeakQuestions"));

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
      <Route path="/dashboard" component={() => <Suspense><Dashboard /></Suspense>} />
      <Route path="/dashboard/:subject" component={() => <Suspense><Dashboard /></Suspense>} />
      <Route path="/:subject" component={() => <Suspense><SelectMenu /></Suspense>} />
      <Route path="/:subject/weak" component={() => <Suspense><WeakQuestionsPage /></Suspense>} />
      <Route path="/:subject/favorite" component={() => <Suspense><FavoritesPage /></Suspense>} />
      <Route path="/:subject/:section" component={() => <Suspense><Quiz /></Suspense>} />
    </>
  );
}