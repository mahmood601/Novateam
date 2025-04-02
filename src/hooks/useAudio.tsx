import { createSignal } from "solid-js";

export function useAudio(successSrc: string, wrongSrc: string) {
    const [audioEnabled, setAudioEnabled] = createSignal(true);
    const audio = new Audio()

    function playSound(isCorrect: boolean) {
       audio.src = isCorrect? successSrc: wrongSrc;
       if (audioEnabled()) {
        audio.play()
       }
    }
    return {audioEnabled, setAudioEnabled, playSound}
}