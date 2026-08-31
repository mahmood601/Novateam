import { createSignal } from "solid-js";

const [quizType, setQuizType] = createSignal<"restart" | "continue">("restart");

export {quizType, setQuizType};