import { Route } from "@solidjs/router";
import UI from "../pages/UI";
import Profile from "../pages/Profile/Profile";
import Login from "../pages/Login";
import Settings from "../pages/Settings";
import SelectMenu from "../components/SelectMenu";
import Quiz from "../pages/Quiz/Quiz";
import FavoritesPage from "../pages/Favorites";

export default function AppRoutes() {
  return (
    <>
      <Route path="/" component={UI} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/settings" component={Settings} />
      <Route path="/:subject" component={SelectMenu} />
      <Route path="/:subject/:section" component={Quiz} />
      <Route path="/:subject/favorite" component={FavoritesPage} />
    </>
  );
}