export function getActionSkipper(every: number) {
  return {
    counter: 0,
    step() {
      this.counter = this.counter + 1;
    },
    shouldAct() {
      return this.counter % every == 0;
    },
  };
}
