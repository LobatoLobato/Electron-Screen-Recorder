class StopWatch {
  #startTime;
  #intervalId;
  value;
  ms;
  start(callback, timeLimit, timeoutfn) {
    this.#startTime = new Date().getTime();
    this.#intervalId = setInterval(() => {
      const ms = new Date().getTime() - this.#startTime;
      this.ms = ms;
      if (ms >= timeLimit) {
        this.stop();
        callback(this.#formatTime(timeLimit - 1));
        timeoutfn();
        return;
      }
      callback(this.#formatTime(ms));
    }, 1);
  }

  stop(callback) {
    clearInterval(this.#intervalId);
    if (callback) callback();
  }

  #formatTime(ms) {
    const hours =
      Math.floor(ms / 3600000) - Math.floor(Math.floor(ms / 3600000) / 24) * 24;
    const minutes =
      Math.floor(ms / 60000) - Math.floor(Math.floor(ms / 60000) / 60) * 60;
    const seconds =
      Math.floor(ms / 1000) - Math.floor(Math.floor(ms / 1000) / 60) * 60;
    const milliseconds = ms - Math.floor(ms / 1000) * 1000;

    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  }
}
