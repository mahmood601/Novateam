import { createResource, Match, Suspense, Switch } from "solid-js";
import { useUser } from "../../context/user";
import { account } from "../../stores/account";
import DevMode from "./DevMode";
import NormalMode from "./NormalMode";
import Loading from "../../components/loading";

export default function Quiz() {
  const { user } = useUser();
  return (
    <Suspense>
      <Switch>
        <Match when={account.devMode && user()?.role === "admin"}>
          <DevMode />
        </Match>
        <Match when={true}>
          <NormalMode />
        </Match>
      </Switch>
    </Suspense>
  );
}
