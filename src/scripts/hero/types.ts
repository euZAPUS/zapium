export interface HeroScene {
  canvas: HTMLCanvasElement;
  resize(width: number, height: number): void;
  /** `pointer` va de -1 a 1 respecto al centro del escenario. */
  frame(time: number, pointer: { x: number; y: number }): void;
  /** Relee los colores de los tokens (cambio de tema). */
  colors(): void;
  destroy(): void;
}
