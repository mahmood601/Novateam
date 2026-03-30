import { createResource, Match, Suspense, Switch } from "solid-js";
import { useUser } from "../../context/user";
import { account } from "../../stores/account";
import DevMode from "./DevMode";
import NormalMode from "./NormalMode";
import Loading from "../../components/loading";

export default function Quiz() {
const {user, isLoading } = useUser();
  return (
    <Suspense>
      <Switch>
        <Match when={isLoading()}>
          <Loading/>
        </Match>
        <Match when={!isLoading() && account.devMode && user()?.role === "admin"  }>
          <DevMode />
        </Match>
        <Match when={!isLoading() && !account.devMode}>
          <NormalMode />
          </Match>
          <Match when={!isLoading() && user()?.role == "admin" && !account.devMode}>
          <NormalMode />
          </Match>
      </Switch>
    </Suspense>
  );
}
