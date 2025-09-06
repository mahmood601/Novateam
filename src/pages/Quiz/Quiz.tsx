import { createResource, Match, Suspense, Switch } from "solid-js";
import { useUser } from "../../context/user";
import { account } from "../../stores/account";
import DevMode from "./DevMode";
import NormalMode from "./NormalMode";

export default function Quiz() {
const [user] = createResource(() => useUser().user())

  return (
    <Suspense>
      <Switch>
        <Match when={user.state =="ready" && user()?.labels.indexOf("admin") != -1 && account.devMode}>
          <DevMode />
        </Match>
        <Match when={user.state =="ready" && !account.devMode}>
          <NormalMode />
          </Match>
      </Switch>
    </Suspense>
  );
}
