import { createStore } from "solid-js/store";

const [quizState, setQuizState] = createStore({
  index: 0,
  showResult: false,
  userAnswers: [] as any[],
  isOptionDisabled: false,
  selectedOption: 7,
  audioEnabled: true
});

export { quizState, setQuizState };
