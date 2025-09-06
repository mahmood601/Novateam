export default class Timer {
  private timerId: any | null = null;
  private start: number = 0;
  private remaining: number;

  constructor(
    private callback: () => void,
    delay: number,
  ) {
    this.remaining = delay;
    this.resume();
  }

  pause(): void {
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
      this.remaining -= Date.now() - this.start;
    }
  }

  resume(): void {
    if (this.timerId) {
      return;
    }
    this.start = Date.now();
    this.timerId = setTimeout(() => {
      this.callback();
      this.timerId = null;
    }, this.remaining);
    this.remaining -= Date.now() - this.start;
  }
}
