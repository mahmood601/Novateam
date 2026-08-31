import { createStore } from "solid-js/store";

export const [stateStore, setStateStore] = createStore({
  numberOfCorrect: 0,
  timer: {
    value: 0,
    isPaused: false,
  },
  numberOfAnswered: 0,
})


