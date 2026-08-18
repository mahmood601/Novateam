import { createStore } from "solid-js/store";

const [quizState, setQuizState] = createStore({
  index: 0,
  showResult: false,
  userAnswers: [] as any[],
  isOptionDisabled: false,
  selectedOption: 7,
  audioEnabled: true
});

export function resetQuizState() {
  setQuizState({
    index: 0,
    showResult: false,
    userAnswers: [],
    isOptionDisabled: false,
    selectedOption: 7,
    // audioEnabled يبقى كما هو — إعداد المستخدم
  });
}

export { quizState, setQuizState };
