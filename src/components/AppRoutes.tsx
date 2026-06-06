import { Route } from "@solidjs/router";
import SubjectsPage from "../pages/SubjectsPage";
import Profile from "../pages/Profile";
import Login from "../pages/Login";
import Settings from "../pages/Settings";
import SelectMenu from "../pages/SelectMenu";
import Quiz from "../pages/Quiz/Quiz";
import FavoritesPage from "../pages/Favorites";
import StatsPage from "../pages/Stats";
import SearchPage from "../pages/Search";
import AuthCallback from "./auth/AuthCallback";
import WeakQuestionsPage from "../pages/WeakQuestions";
import Dashboard from "../pages/Dashboard";

export default function AppRoutes() {
  return (
    <>
      <Route path="/" component={SubjectsPage} />
      <Route path="/profile" component={Profile} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/login" component={Login} />
      <Route path="/search" component={SearchPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/:subject" component={Dashboard} />
      <Route path="/:subject" component={SelectMenu} />
      <Route path="/:subject/weak" component={WeakQuestionsPage} />
      <Route path="/:subject/favorite" component={FavoritesPage} />
      <Route path="/:subject/:section" component={Quiz} />
    </>
  );
}