import { createSignal } from "solid-js";

export type QuizDisplayMode = "horizontal" | "vertical";

const STORAGE_KEY = "quiz_display_mode";

function readInitial(): QuizDisplayMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "horizontal" || saved === "vertical" ? saved : "vertical";
}

const [quizDisplayMode, setQuizDisplayModeRaw] =
  createSignal<QuizDisplayMode>(readInitial());

function setQuizDisplayMode(mode: QuizDisplayMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  setQuizDisplayModeRaw(mode);
}

export { quizDisplayMode, setQuizDisplayMode };
