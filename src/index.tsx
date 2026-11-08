/* @refresh reload */
import { render } from "solid-js/web";
import App from "./app/App";
import { initDiagnostics } from "./features/shared/services/diagnostics";
import { initColors } from "./features/shared/lib/colorOverrides";

initDiagnostics(); // logs failures to the console for debugging purposes
initColors(); // applies the saved color preset/overrides before the first paint

const root = document.getElementById("root");

render(() => <App />, root!);
