import { DrawingScene } from "./DrawingScene";

export type DrawingContent = {
  drawingId: string;
  scene: DrawingScene;
  thumbnail?: Uint8Array;
};
