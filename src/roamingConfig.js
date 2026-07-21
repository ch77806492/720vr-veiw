export const GUIDE_ACTIONS = [
  { id: 'greeting', label: '打招呼' },
  { id: 'talking', label: '说话' },
  { id: 'flying', label: '飞行移动' },
  { id: 'idle', label: '暂停' },
  { id: 'leaving', label: '离场' },
  { id: 'pointing', label: '指路' },
];

const createGuideAssets = () =>
  Object.fromEntries(
    GUIDE_ACTIONS.map((action) => [action.id, { action: action.id, name: '', url: '', assetFileName: '' }]),
  );

export const createRoamingRoute = (index = 1) => ({
  id: `roaming-route-${Date.now()}-${index}`,
  name: `漫游路线${index}`,
  stops: [],
});

export const createDefaultRoamingConfig = () => {
  const route = createRoamingRoute(1);
  return {
    version: 2,
    enabled: false,
    activeRouteId: route.id,
    music: { name: '', url: '', assetFileName: '' },
    guide: { assets: createGuideAssets() },
    routes: [route],
  };
};

const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const zoomToFov = (zoom) => clamp(7000 / clamp(finite(zoom, 100), 80, 230), 30, 88);
export const fovToZoom = (fov) => clamp(7000 / clamp(finite(fov, 70), 30, 88), 80, 230);

const normalizeTimedClip = (clip, duration, fallbackDuration = 3) => {
  const start = clamp(finite(clip?.start, 0), 0, Math.max(0, duration - 0.5));
  return {
    start,
    duration: clamp(finite(clip?.duration, fallbackDuration), 0.5, Math.max(0.5, duration - start)),
  };
};

const normalizeGuideClip = (clip, duration, index) => ({
  id: clip.id || `guide-clip-${Date.now()}-${index}`,
  action: GUIDE_ACTIONS.some((action) => action.id === clip.action) ? clip.action : 'idle',
  ...normalizeTimedClip(clip, duration, 2),
  desktop: {
    x: Math.max(8, Math.min(92, finite(clip.desktop?.x, 82))),
    y: Math.max(10, Math.min(88, finite(clip.desktop?.y, 72))),
    endX: Math.max(8, Math.min(92, finite(clip.desktop?.endX, clip.desktop?.x ?? 82))),
    endY: Math.max(10, Math.min(88, finite(clip.desktop?.endY, clip.desktop?.y ?? 72))),
    size: Math.max(8, Math.min(30, finite(clip.desktop?.size, 14))),
    tilt: Math.max(-45, Math.min(45, finite(clip.desktop?.tilt, 0))),
  },
  mobile: {
    x: Math.max(12, Math.min(88, finite(clip.mobile?.x, 72))),
    y: Math.max(12, Math.min(82, finite(clip.mobile?.y, 66))),
    endX: Math.max(12, Math.min(88, finite(clip.mobile?.endX, clip.mobile?.x ?? 72))),
    endY: Math.max(12, Math.min(82, finite(clip.mobile?.endY, clip.mobile?.y ?? 66))),
    size: Math.max(14, Math.min(34, finite(clip.mobile?.size, 22))),
    tilt: Math.max(-45, Math.min(45, finite(clip.mobile?.tilt, 0))),
  },
});

const normalizeNarrationClip = (clip, duration, index) => ({
  id: clip.id || `narration-clip-${Date.now()}-${index}`,
  name: String(clip.name || '解说音频'),
  url: String(clip.url || ''),
  assetFileName: String(clip.assetFileName || ''),
  trimStart: clamp(finite(clip.trimStart, 0), 0, 3600),
  ...normalizeTimedClip(clip, duration, 5),
});

const normalizeImageClip = (clip, duration, index) => ({
  id: clip.id || `image-clip-${Date.now()}-${index}`,
  name: String(clip.name || '插入图片'),
  url: String(clip.url || ''),
  assetFileName: String(clip.assetFileName || ''),
  ...normalizeTimedClip(clip, duration, 3),
  desktop: {
    x: clamp(finite(clip.desktop?.x, 50), 5, 95),
    y: clamp(finite(clip.desktop?.y, 50), 5, 95),
    size: clamp(finite(clip.desktop?.size, 28), 8, 70),
  },
  mobile: {
    x: clamp(finite(clip.mobile?.x, 50), 8, 92),
    y: clamp(finite(clip.mobile?.y, 45), 8, 88),
    size: clamp(finite(clip.mobile?.size, 60), 18, 90),
  },
});

const normalizeCameraKeyframe = (frame, scene, duration, index) => {
  const fov = frame?.zoom != null ? zoomToFov(frame.zoom) : clamp(finite(frame?.fov, 70), 30, 88);
  return {
    id: frame?.id || `camera-${scene.id}-${index}`,
    time: clamp(finite(frame?.time, 0), 0, duration),
    yaw: finite(frame?.yaw, scene.initialYaw ?? -24),
    pitch: clamp(finite(frame?.pitch, scene.initialPitch ?? 1), -78, 78),
    fov,
    zoom: fovToZoom(fov),
  };
};

const normalizeStop = (stop, scenes, index) => {
  const scene = scenes.find((item) => item.id === stop?.sceneId);
  if (!scene) return null;
  const duration = Math.max(2, Math.min(120, finite(stop.duration, 8)));
  return {
    id: stop.id || `roaming-stop-${scene.id}-${index}`,
    sceneId: scene.id,
    duration,
    transitionDuration: Math.max(0.3, Math.min(5, finite(stop.transitionDuration, 1.2))),
    cameraKeyframes: (
      Array.isArray(stop.cameraKeyframes) && stop.cameraKeyframes.length
        ? stop.cameraKeyframes
        : [{
            id: `camera-${scene.id}-0`,
            time: 0,
            yaw: finite(scene.initialYaw, -24),
            pitch: finite(scene.initialPitch, 1),
            fov: 70,
          }]
    ).map((frame, frameIndex) => normalizeCameraKeyframe(frame, scene, duration, frameIndex)),
    guideClips: (Array.isArray(stop.guideClips) ? stop.guideClips : []).map((clip, clipIndex) => normalizeGuideClip(clip, duration, clipIndex)),
    narrationClips: (Array.isArray(stop.narrationClips) ? stop.narrationClips : []).map((clip, clipIndex) => normalizeNarrationClip(clip, duration, clipIndex)),
    imageClips: (Array.isArray(stop.imageClips) ? stop.imageClips : []).map((clip, clipIndex) => normalizeImageClip(clip, duration, clipIndex)),
  };
};

export const normalizeRoamingConfig = (value, scenes = []) => {
  const fallback = createDefaultRoamingConfig();
  const routes = (Array.isArray(value?.routes) && value.routes.length ? value.routes : fallback.routes).map(
    (route, routeIndex) => ({
      id: route.id || `roaming-route-${routeIndex + 1}`,
      name: route.name || `漫游路线${routeIndex + 1}`,
      stops: (route.stops || [])
        .map((stop, stopIndex) => normalizeStop(stop, scenes, stopIndex))
        .filter(Boolean),
    }),
  );
  const assets = createGuideAssets();
  GUIDE_ACTIONS.forEach((action) => {
    assets[action.id] = { ...assets[action.id], ...(value?.guide?.assets?.[action.id] || {}) };
  });
  const activeRouteId = routes.some((route) => route.id === value?.activeRouteId)
    ? value.activeRouteId
    : routes[0].id;
  return {
    version: 2,
    enabled: Boolean(value?.enabled),
    activeRouteId,
    music: { ...fallback.music, ...(value?.music || {}) },
    guide: { assets },
    routes,
  };
};

export const createRoamingStop = (scene, index = 0) => ({
  id: `roaming-stop-${scene.id}-${Date.now()}-${index}`,
  sceneId: scene.id,
  duration: 8,
  transitionDuration: 1.2,
  cameraKeyframes: [
    {
      id: `camera-${scene.id}-${Date.now()}`,
      time: 0,
      yaw: finite(scene.initialYaw, -24),
      pitch: finite(scene.initialPitch, 1),
      fov: 70,
      zoom: 100,
    },
  ],
  guideClips: [],
  narrationClips: [],
  imageClips: [],
});

export const createGuideClip = (action = 'idle') => normalizeGuideClip({ action }, 8, 0);

export const createNarrationClip = (asset = {}) => normalizeNarrationClip(asset, 8, 0);

export const createImageClip = (asset = {}) => normalizeImageClip(asset, 8, 0);
