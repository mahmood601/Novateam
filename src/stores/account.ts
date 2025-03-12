import { createStore } from "solid-js/store";

export const [account, setAccount] = createStore({
  name: "",
  devMode: true,
})
