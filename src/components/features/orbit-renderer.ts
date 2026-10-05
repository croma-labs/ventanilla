import { Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { orbitTiles, projectTile } from "../../data/orbit";

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform vec4 uBounds;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(uBounds.xy + position.xy * uBounds.zw, 0.0, 1.0);
}`;

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uTint;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uTexture, vUv);
  gl_FragColor = vec4(color.rgb * uTint.x, color.a * uTint.y);
}`;

export const tileSize = { width: 480, height: 334 };

const hue = (seed: string) => [...seed].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 360, 7);

export function drawTile(label: string) {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize.width;
  canvas.height = tileSize.height;
  const context = canvas.getContext("2d")!;
  const h = hue(label);
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(0, 0, tileSize.width, tileSize.height, 28);
  context.fill();
  context.fillStyle = "#f2f3f5";
  context.beginPath();
  context.roundRect(0, 0, tileSize.width, 52, [28, 28, 0, 0]);
  context.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((color, index) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(30 + index * 22, 26, 7, 0, Math.PI * 2);
    context.fill();
  });
  const band = context.createLinearGradient(0, 52, tileSize.width, 200);
  band.addColorStop(0, `oklch(0.55 0.14 ${h})`);
  band.addColorStop(1, `oklch(0.36 0.12 ${(h + 40) % 360})`);
  context.fillStyle = band;
  context.fillRect(0, 52, tileSize.width, 150);
  context.fillStyle = "#ffffff";
  context.font = `400 ${label.length > 14 ? 40 : 52}px "Instrument Serif", serif`;
  context.textBaseline = "middle";
  context.fillText(label, 32, 130, tileSize.width - 64);
  context.fillStyle = "#e3e4e6";
  [0, 1, 2].forEach((row) => {
    context.beginPath();
    context.roundRect(32, 228 + row * 28, row === 2 ? 220 : 416, 12, 6);
    context.fill();
  });
  return canvas;
}

export async function createOrbitRenderer(canvas: HTMLCanvasElement) {
  const renderer = new Renderer({ canvas, alpha: true, premultipliedAlpha: true, dpr: Math.min(2, devicePixelRatio) });
  const { gl } = renderer;
  gl.clearColor(0, 0, 0, 0);

  const scene = new Transform();
  const geometry = new Plane(gl);
  await document.fonts.load('400 52px "Instrument Serif"').catch(() => undefined);
  const labels = [...new Set(orbitTiles.map((tile) => tile.label))];
  const textures = new Map(labels.map((label) => [label, new Texture(gl, { image: drawTile(label), minFilter: gl.LINEAR_MIPMAP_LINEAR })]));

  const meshes = orbitTiles.map((tile) => {
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: { uTexture: { value: textures.get(tile.label) }, uBounds: { value: [0, 0, 0, 0] }, uTint: { value: [1, 1] } },
    });
    program.setBlendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);
    return mesh;
  });

  const resize = () => {
    const { width, height } = (canvas.parentElement ?? canvas).getBoundingClientRect();
    renderer.setSize(width, height);
  };

  const render = (angle: number) => {
    orbitTiles.forEach((tile, index) => {
      const projected = projectTile(tile, angle);
      const { uniforms } = meshes[index].program;
      uniforms.uBounds.value = [projected.x * 2 - 1, 1 - projected.y * 2, projected.width * 2, projected.height * 2];
      uniforms.uTint.value = [projected.brightness, projected.opacity];
      meshes[index].renderOrder = projected.order * orbitTiles.length + index;
    });
    renderer.render({ scene, sort: true });
  };

  return {
    resize,
    render,
    destroy: () => gl.getExtension("WEBGL_lose_context")?.loseContext(),
  };
}

export type OrbitRenderer = Awaited<ReturnType<typeof createOrbitRenderer>>;
