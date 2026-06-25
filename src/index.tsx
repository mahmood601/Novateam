/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { initDiagnostics } from "./services/diagnostics";

initDiagnostics(); // ✅ يبدأ تسجيل console logs منذ أول لحظة، قبل أي خطأ محتمل

const root = document.getElementById("root");

render(() => <App />, root!);
