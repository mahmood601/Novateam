import { createStore } from "solid-js/store";



export const [account, setAccount] = createStore({
  devMode:  localStorage.getItem("dev") == "true" ? true: false || false,
})



