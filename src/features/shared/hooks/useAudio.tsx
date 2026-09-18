import { createSignal } from "solid-js";

const success = "/success.mp3";
const wrong = "/wrong.mp3";

const audio = new Audio();

const saved = localStorage.getItem("audioEnabled");
const [audioEnabled, setAudioRaw] = createSignal<boolean>(saved !== "false");

function setAudio(val: boolean) {
  setAudioRaw(val);
  localStorage.setItem("audioEnabled", String(val));
}

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
