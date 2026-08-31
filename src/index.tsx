/* @refresh reload */
import { render } from "solid-js/web";
import App from "./app/App";
import { initDiagnostics } from "./features/shared/services/diagnostics";

initDiagnostics(); // logs failures to the console for debugging purposes

const root = document.getElementById("root");

render(() => <App />, root!);
