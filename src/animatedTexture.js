import * as THREE from 'three';

const clampPlayCount = (value) => Math.max(0, Math.min(10, Number(value) || 0));

const waitForImage = (image) =>
  new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('动态图片加载失败'));
  });

export async function createAnimatedTexture(url, { playCount = 0, onReady } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const context = canvas.getContext('2d', { alpha: true });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  let disposed = false;
  let timer = 0;
  let animationFrame = 0;
  let decoder = null;
  let objectUrl = '';

  const resize = (width, height) => {
    const nextWidth = Math.max(1, Number(width) || 1);
    const nextHeight = Math.max(1, Number(height) || 1);
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
    onReady?.(nextWidth / nextHeight);
  };

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`动态图片加载失败：${response.status}`);
    const blob = await response.blob();

    if ('ImageDecoder' in window) {
      const fallbackType = String(url).toLowerCase().includes('.webp') ? 'image/webp' : 'image/gif';
      decoder = new window.ImageDecoder({ data: await blob.arrayBuffer(), type: blob.type || fallbackType });
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = Math.max(1, Number(track?.frameCount) || 1);
      const targetLoops = clampPlayCount(playCount);
      let frameIndex = 0;
      let completedLoops = 0;

      const drawNextFrame = async () => {
        if (disposed) return;
        try {
          const result = await decoder.decode({ frameIndex });
          const frame = result.image;
          resize(frame.displayWidth || frame.codedWidth, frame.displayHeight || frame.codedHeight);
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(frame, 0, 0, canvas.width, canvas.height);
          texture.needsUpdate = true;
          const duration = Math.max(20, Number(frame.duration || 100000) / 1000);
          frame.close();

          frameIndex += 1;
          if (frameIndex >= frameCount) {
            frameIndex = 0;
            completedLoops += 1;
            if (targetLoops > 0 && completedLoops >= targetLoops) return;
          }
          timer = window.setTimeout(drawNextFrame, duration);
        } catch (error) {
          if (!disposed && error?.name !== 'AbortError') console.warn(error);
        }
      };

      drawNextFrame();
    } else {
      const image = new Image();
      image.decoding = 'async';
      objectUrl = URL.createObjectURL(blob);
      image.src = objectUrl;
      await waitForImage(image);
      resize(image.naturalWidth, image.naturalHeight);
      const drawNativeAnimation = () => {
        if (disposed) return;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;
        animationFrame = requestAnimationFrame(drawNativeAnimation);
      };
      drawNativeAnimation();
    }
  } catch (error) {
    if (!disposed && error?.name !== 'AbortError') console.warn(error);
  }

  return {
    texture,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
      decoder?.close?.();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = '';
      texture.dispose();
    },
  };
}
