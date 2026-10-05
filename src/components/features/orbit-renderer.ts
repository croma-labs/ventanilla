import { Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { iconOf, orbitSites, orbitTiles, projectTile, type OrbitSite } from "../../data/orbit";

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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export function drawTile({ label, domain }: OrbitSite, icon: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize.width;
  canvas.height = tileSize.height;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(0, 0, tileSize.width, tileSize.height, 28);
  context.fill();
  context.fillStyle = "#f2f3f5";
  context.beginPath();
  context.roundRect(0, 0, tileSize.width, 52, [28, 28, 0, 0]);
  context.fill();
  ["#fcd116", "#003893", "#ce1126"].forEach((color, index) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(30 + index * 20, 26, 6, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = "#0e1a3399";
  context.font = '500 20px "Inter Tight Variable", sans-serif';
  context.textBaseline = "middle";
  context.fillText(domain, 104, 27, tileSize.width - 132);
  if (icon) {
    const box = 112;
    const fit = Math.min(box / icon.naturalWidth, box / icon.naturalHeight);
    const width = icon.naturalWidth * fit;
    const height = icon.naturalHeight * fit;
    context.imageSmoothingQuality = "high";
    context.drawImage(icon, 36 + (box - width) / 2, 80 + (box - height) / 2, width, height);
  }
  context.fillStyle = "#0e1a33";
  context.font = `400 ${label.length > 12 ? 40 : 50}px "Instrument Serif", serif`;
  context.fillText(label, icon ? 172 : 36, 138, tileSize.width - (icon ? 200 : 64));
  context.fillStyle = "#e6e7ea";
  [0, 1].forEach((row) => {
    context.beginPath();
    context.roundRect(36, 240 + row * 30, row === 1 ? 220 : 408, 12, 6);
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
  await Promise.all([document.fonts.load('400 52px "Instrument Serif"'), document.fonts.load('500 20px "Inter Tight Variable"')]).catch(() => undefined);
  const icons = await Promise.all(orbitSites.map((entry) => loadImage(iconOf(entry.domain))));
  const textures = new Map(orbitSites.map((entry, index) => [entry, new Texture(gl, { image: drawTile(entry, icons[index]), minFilter: gl.LINEAR_MIPMAP_LINEAR })]));

  const meshes = orbitTiles.map((tile) => {
    const program = new Program(gl, {
      vertex,
      fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: { uTexture: { value: textures.get(tile.site) }, uBounds: { value: [0, 0, 0, 0] }, uTint: { value: [1, 1] } },
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
