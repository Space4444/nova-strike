export class Input {
  private keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseDown = false;
  pausePressed = false;

  private canvas: HTMLCanvasElement;
  private listeners: Array<[EventTarget, string, EventListener]> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.on(window, "keydown", e => {
      const ke = e as KeyboardEvent;
      this.keys.add(ke.code);
      if (ke.code === "Escape" || ke.code === "KeyP") this.pausePressed = true;
      // Prevent page scroll on space/arrows
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          ke.code,
        )
      ) {
        ke.preventDefault();
      }
    });
    this.on(window, "keyup", e => this.keys.delete((e as KeyboardEvent).code));
    this.on(window, "blur", () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    this.on(canvas, "mousemove", e => {
      const me = e as MouseEvent;
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = me.clientX - rect.left;
      this.mouseY = me.clientY - rect.top;
    });
    this.on(canvas, "mousedown", e => {
      if ((e as MouseEvent).button === 0) this.mouseDown = true;
    });
    this.on(window, "mouseup", e => {
      if ((e as MouseEvent).button === 0) this.mouseDown = false;
    });
    this.on(canvas, "contextmenu", e => e.preventDefault());
  }

  private on(target: EventTarget, type: string, fn: EventListener) {
    target.addEventListener(type, fn);
    this.listeners.push([target, type, fn]);
  }

  /** Returns normalized movement axis from WASD / arrow keys. */
  axis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  consumePause(): boolean {
    const p = this.pausePressed;
    this.pausePressed = false;
    return p;
  }

  destroy() {
    for (const [target, type, fn] of this.listeners) {
      target.removeEventListener(type, fn);
    }
    this.listeners = [];
  }
}
