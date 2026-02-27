import { createSignal } from "solid-js";

const success = "/success.mp3";
const wrong = "/wrong.mp3";
const audio = new Audio();
const [audioEnabled, setAudio] = createSignal<boolean>(true);

export function useAudio() {
  function playSound(isCorrect: boolean) {

    audio.src = isCorrect ? success : wrong;
    if (audioEnabled()) {
      audio.currentTime = 0;
      audio.play();
    }
  }
  return { audioEnabled, setAudio, playSound };
}
