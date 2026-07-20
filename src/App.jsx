import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileImage,
  ImagePlus,
  Link2,
  MapPinned,
  Move,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import PanoramaViewer from './PanoramaViewer.jsx';

const demoPanorama = '/demo-campus-panorama.svg';
const previewPath = '/tour-preview.html';
const sceneTreeMinHeight = 742;

const campusGroups = [
  { id: 'outdoor', name: '户外', floors: [{ id: 'outdoor-campus', name: '总平面图', mapType: 'campus' }] },
  {
    id: 'building-1',
    name: '一号楼',
    floors: [
      { id: 'building-1-floor-1', name: '1层', mapType: 'floor', variant: 'b1-1' },
      { id: 'building-1-floor-2', name: '2层', mapType: 'floor', variant: 'b1-upper' },
      { id: 'building-1-floor-3', name: '3层', mapType: 'floor', variant: 'b1-upper' },
    ],
  },
  {
    id: 'building-2',
    name: '二号楼',
    floors: [
      { id: 'building-2-floor-1', name: '1层', mapType: 'floor', variant: 'linear-1f' },
      { id: 'building-2-floor-2', name: '2层', mapType: 'floor', variant: 'linear-upper' },
    ],
  },
  {
    id: 'building-3',
    name: '三号楼',
    floors: [
      { id: 'building-3-floor-1', name: '1层', mapType: 'floor', variant: 'linear-1f' },
      { id: 'building-3-floor-2', name: '2层', mapType: 'floor', variant: 'linear-upper' },
    ],
  },
  {
    id: 'building-4',
    name: '四号楼',
    floors: [
      { id: 'building-4-floor-b1', name: '负1层', mapType: 'floor', variant: 'b4-b1' },
      { id: 'building-4-floor-1', name: '1层', mapType: 'floor', variant: 'b4-1' },
    ],
  },
];

const initialScenes = [
  {
    id: 'outdoor-gate',
    name: '校园大门',
    groupId: 'outdoor',
    floorId: 'outdoor-campus',
    status: '示例',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '泰安中公学习城入口全景，可作为公开浏览页默认起点。',
    videoUrl: '',
    campusPosition: { x: 17, y: 50 },
    mapPosition: { x: 17, y: 50 },
    hotspots: [{ id: 'hs-gate-1', label: '进入一号楼', yaw: -30, pitch: 0, targetSceneId: 'building-1-1f-hall' }],
    videoSpots: [
      {
        id: 'video-gate-1',
        label: '校园介绍视频',
        yaw: 46,
        pitch: 0,
        url: '',
        displayStyle: 'large',
      },
    ],
    animatedSpots: [],
  },
  {
    id: 'building-1-1f-hall',
    name: '一号楼 1层大厅',
    groupId: 'building-1',
    floorId: 'building-1-floor-1',
    status: '待上传',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '一号楼一层全景点位，平面图与其他楼层不同。',
    videoUrl: '',
    campusPosition: { x: 63, y: 24 },
    mapPosition: { x: 63, y: 48 },
    hotspots: [{ id: 'hs-1f-1', label: '前往二层', yaw: 28, pitch: 0, targetSceneId: 'building-1-2f-corridor' }],
    videoSpots: [],
    animatedSpots: [],
  },
  {
    id: 'building-1-2f-corridor',
    name: '一号楼 2层走廊',
    groupId: 'building-1',
    floorId: 'building-1-floor-2',
    status: '待上传',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '一号楼二层全景点位，二层与三层采用相近走廊分布。',
    videoUrl: '',
    campusPosition: { x: 63, y: 24 },
    mapPosition: { x: 50, y: 52 },
    hotspots: [{ id: 'hs-2f-1', label: '返回一层', yaw: -22, pitch: 0, targetSceneId: 'building-1-1f-hall' }],
    videoSpots: [],
    animatedSpots: [],
  },
  {
    id: 'building-2-1f-corridor',
    name: '二号楼 1层走廊',
    groupId: 'building-2',
    floorId: 'building-2-floor-1',
    status: '待上传',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '二号楼一层全景点位。',
    videoUrl: '',
    campusPosition: { x: 51, y: 72 },
    mapPosition: { x: 48, y: 50 },
    hotspots: [],
    videoSpots: [],
    animatedSpots: [],
  },
  {
    id: 'building-3-1f-corridor',
    name: '三号楼 1层走廊',
    groupId: 'building-3',
    floorId: 'building-3-floor-1',
    status: '待上传',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '三号楼一层全景点位。',
    videoUrl: '',
    campusPosition: { x: 75, y: 72 },
    mapPosition: { x: 50, y: 50 },
    hotspots: [],
    videoSpots: [],
    animatedSpots: [],
  },
  {
    id: 'building-4-1f-corridor',
    name: '四号楼 1层走廊',
    groupId: 'building-4',
    floorId: 'building-4-floor-1',
    status: '待上传',
    imageUrl: demoPanorama,
    imageDataUrl: null,
    description: '四号楼一层全景点位。',
    videoUrl: '',
    campusPosition: { x: 84, y: 26 },
    mapPosition: { x: 36, y: 38 },
    hotspots: [],
    videoSpots: [],
    animatedSpots: [],
  },
];




const uploadAssetFile = async (fileOrBlob, kind, name, options = {}) => {
  const fileName = name || fileOrBlob?.name || `${kind}-asset.bin`;
  const response = await fetch(
    `/api/upload-asset?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(fileName)}${options.stable ? '&stable=1' : ''}`,
    {
      method: 'POST',
      body: fileOrBlob,
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '璧勬簮涓婁紶澶辫触');
  }
  return response.json();
};

const uploadPanoramaAndSplit = async (fileOrBlob, sceneId, name) => {
  const fileName = name || fileOrBlob?.name || 'panorama.jpg';
  const response = await fetch(
    `/api/upload-panorama-and-split?sceneId=${encodeURIComponent(sceneId)}&name=${encodeURIComponent(fileName)}`,
    {
      method: 'POST',
      body: fileOrBlob,
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || '全景图切图失败');
  }
  return response.json();
};

const normalizeFileMatchText = (value) =>
  String(value || '')
    .replace(/\.[^.]+$/i, '')
    .toLowerCase()
    .replace(/[\s_锛堬級()銆愩€慭[\]{}路,锛?銆?]+/g, '')
    .trim();

const sceneMatchTokens = (scene) =>
  [
    scene.id,
    scene.name,
    scene.assetFileName,
    scene.thumbnailFileName,
    scene.imageUrl,
  ]
    .map(normalizeFileMatchText)
    .filter((token) => token.length >= 2);

const findSceneByPanoramaFile = (file, scenes, usedSceneIds = new Set()) => {
  const fileToken = normalizeFileMatchText(file?.name);
  if (!fileToken) return null;
  const candidates = scenes
    .filter((scene) => !usedSceneIds.has(scene.id))
    .map((scene) => {
      const tokens = sceneMatchTokens(scene);
      const score = tokens.reduce((best, token) => {
        if (fileToken === token) return Math.max(best, 1000 + token.length);
        if (fileToken.includes(token)) return Math.max(best, 600 + token.length);
        if (token.includes(fileToken)) return Math.max(best, 400 + fileToken.length);
        return best;
      }, 0);
      return { scene, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.scene || null;
};

const createImageThumbnail = (file, maxWidth = 360, maxHeight = 210) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Thumbnail generation failed'));
        },
        'image/webp',
        0.72,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Thumbnail image load failed'));
    };
    image.src = objectUrl;
  });

const isReusableAssetUrl = (url) =>
  typeof url === 'string' &&
  (url.startsWith('/tour-output/assets/') ||
    url.startsWith('./assets/') ||
    url.startsWith('assets/') ||
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url === demoPanorama);

const toPackageAssetUrl = (url) => {
  if (!url || url.startsWith('data:')) return url;
  if (url.startsWith('/tour-output/assets/')) return `./${url.replace('/tour-output/', '')}`;
  if (url.startsWith('assets/')) return `./${url}`;
  return url;
};

const mapKrpanoTileUrls = (tiles, mapper) => {
  if (!tiles) return null;
  return {
    ...tiles,
    tileBaseUrl: mapper(tiles.tileBaseUrl),
    previewUrl: mapper(tiles.previewUrl),
    thumbUrl: mapper(tiles.thumbUrl),
    pattern: mapper(tiles.pattern),
  };
};

const mapManualTileUrls = (tiles, mapper) =>
  tiles?.mode === 'manualTiles' ? mapKrpanoTileUrls(tiles, mapper) : null;

const defaultManualTilePattern = (scene) => {
  const rawName = String(scene?.assetFileName || scene?.name || scene?.id || 'scene')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'scene';
  return `/tour-output/assets/manual-tiles/${rawName}/{face}/{row}_{col}.webp`;
};

const sceneIdManualTilePattern = (scene) =>
  `/tour-output/assets/manual-tiles/${scene?.id || 'scene'}/{face}/{row}_{col}.webp`;

const createManualTiles = (scene, patch = {}) => {
  const current = scene?.krpanoTiles || {};
  const grid = Math.max(1, Math.min(4, Number(patch.grid ?? current.grid ?? 1) || 1));
  const level = Math.max(1, Math.min(4, Number(patch.level ?? current.level ?? 1) || 1));
  const tileSize = Math.max(256, Math.min(4096, Number(patch.tileSize ?? current.tileSize ?? 1024) || 1024));
  return {
    mode: 'manualTiles',
    tileBaseUrl: patch.tileBaseUrl ?? current.tileBaseUrl ?? '',
    previewUrl: patch.previewUrl ?? current.previewUrl ?? '',
    thumbUrl: patch.thumbUrl ?? current.thumbUrl ?? '',
    pattern: patch.pattern ?? current.pattern ?? defaultManualTilePattern(scene),
    level,
    grid,
    tileSize,
    faceSize: grid * tileSize,
  };
};

const inferManualTiles = (scene) => {
  if (scene?.imageMode !== 'krpanoTiles' && scene?.imageMode !== 'manualTiles') return null;
  if (scene?.krpanoTiles?.pattern?.includes(`/manual-tiles/${scene?.id}/`)) return scene.krpanoTiles;
  return createManualTiles(scene, {
    pattern: sceneIdManualTilePattern(scene),
    tileBaseUrl: `/tour-output/assets/manual-tiles/${scene?.id || 'scene'}`,
    previewUrl: `/tour-output/assets/manual-tiles/${scene?.id || 'scene'}/f/1_1.webp`,
    thumbUrl: `/tour-output/assets/manual-tiles/${scene?.id || 'scene'}/f/1_1.webp`,
    grid: scene?.krpanoTiles?.grid ?? 1,
    level: scene?.krpanoTiles?.level ?? 1,
    tileSize: scene?.krpanoTiles?.tileSize ?? 1024,
  });
};

const stripLegacyTimestampAsset = (url) => {
  return url;
};

const toEditorAssetPathFromName = (kind, fileName) => {
  if (!fileName) return '';
  const value = String(fileName);
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) return toEditorAssetUrl(value);
  if (value.startsWith('./assets/')) return toEditorAssetUrl(value);
  if (value.startsWith('assets/')) return toEditorAssetUrl(value);
  const cleanName = value.split(/[\\/]/).pop();
  return cleanName ? `/tour-output/assets/${kind}/${cleanName}` : '';
};

const pathOnlyAssetUrl = (url, kind, fileName, fallback = '') => {
  if (!url || url.startsWith('data:')) return stripLegacyTimestampAsset(toEditorAssetPathFromName(kind, fileName) || fallback);
  return stripLegacyTimestampAsset(url);
};

const stripHeavyProjectData = (project) => ({
  ...project,
  scenes: (project?.scenes || []).map((scene) => ({
    ...scene,
    imageUrl: pathOnlyAssetUrl(scene.imageUrl, 'panoramas', scene.assetFileName, demoPanorama),
    imageDataUrl: null,
    thumbnailUrl: pathOnlyAssetUrl(scene.thumbnailUrl, 'thumbs', scene.thumbnailFileName, pathOnlyAssetUrl(scene.imageUrl, 'panoramas', scene.assetFileName, demoPanorama)),
    planetUrl: pathOnlyAssetUrl(scene.planetUrl, 'planets', scene.planetFileName, ''),
    planetPreviewUrl: pathOnlyAssetUrl(scene.planetPreviewUrl, 'planets', scene.planetPreviewFileName, ''),
    krpanoTiles: mapManualTileUrls(inferManualTiles(scene), toPackageAssetUrl),
    animatedSpots: (scene.animatedSpots || []).map((spot) => ({
      ...spot,
      imageUrl: pathOnlyAssetUrl(spot.imageUrl, 'animations', spot.assetFileName, ''),
    })),
  })),
  floorMaps: Object.fromEntries(
    Object.entries(project?.floorMaps || {}).map(([floorId, map]) => [
      floorId,
      {
        ...map,
        imageUrl: pathOnlyAssetUrl(map.imageUrl, 'maps', map.assetFileName, ''),
        imageDataUrl: null,
      },
    ]),
  ),
});

const saveBlobAs = async (blob, suggestedName, mimeType) => {
  if ('showSaveFilePicker' in window) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'HTML浏览页面包',
          accept: { [mimeType]: ['.zip'] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
};

const pickZipTarget = async (suggestedName) => {
  if (!('showSaveFilePicker' in window)) return null;

  return window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: 'HTML browser page package',
        accept: { 'application/zip': ['.zip'] },
      },
    ],
  });
};

const saveZipPackage = async (blob, suggestedName, saveHandle) => {
  if (saveHandle) {
    const writable = await saveHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  await saveBlobAs(blob, suggestedName, 'application/zip');
};

const projectStore = {
  dbName: 'school-panorama-publisher',
  storeName: 'projects',
  key: 'current',
};

const openProjectDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(projectStore.dbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(projectStore.storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const clearLegacyProjectStorage = () => {
  try {
    localStorage.removeItem('school-panorama-project');
    localStorage.removeItem('school-panorama-published-project');
  } catch (error) {
    console.warn(error);
  }
};

const writeLocalProject = async (project) => {
  const compactProject = stripHeavyProjectData(project);
  const db = await openProjectDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(projectStore.storeName, 'readwrite');
    tx.objectStore(projectStore.storeName).put(compactProject, projectStore.key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  clearLegacyProjectStorage();
  try {
    localStorage.setItem('school-panorama-project-version', compactProject.generatedAt || String(Date.now()));
  } catch (error) {
    console.warn(error);
  }
};

const readLocalProject = async () => {
  try {
    const db = await openProjectDb();
    const project = await new Promise((resolve, reject) => {
      const tx = db.transaction(projectStore.storeName, 'readonly');
      const request = tx.objectStore(projectStore.storeName).get(projectStore.key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (project?.scenes?.length) return project;
  } catch (error) {
    console.warn(error);
  }

  const stored = localStorage.getItem('school-panorama-project') || localStorage.getItem('school-panorama-published-project');
  if (!stored) return readPublishedProject();

  try {
    const project = JSON.parse(stored);
    return project?.scenes?.length ? project : readPublishedProject();
  } catch (error) {
    console.warn(error);
    return readPublishedProject();
  }
};

const toEditorAssetUrl = (url) => {
  if (!url || url.startsWith('data:') || url.startsWith('http:') || url.startsWith('https:') || url.startsWith('/')) {
    return url;
  }
  if (url.startsWith('./assets/')) return `/tour-output/${url.slice(2)}`;
  if (url.startsWith('assets/')) return `/tour-output/${url}`;
  return url;
};

const preparePublishedProjectForEditor = (project) => ({
  ...project,
  scenes: (project?.scenes || []).map((scene) => ({
    ...scene,
    imageUrl: toEditorAssetUrl(scene.imageUrl),
    thumbnailUrl: toEditorAssetUrl(scene.thumbnailUrl),
    planetUrl: toEditorAssetUrl(scene.planetUrl),
    planetPreviewUrl: toEditorAssetUrl(scene.planetPreviewUrl),
    krpanoTiles: mapManualTileUrls(inferManualTiles(scene), toEditorAssetUrl),
    animatedSpots: (scene.animatedSpots || []).map((spot) => ({
      ...spot,
      imageUrl: toEditorAssetUrl(spot.imageUrl),
    })),
  })),
  floorMaps: Object.fromEntries(
    Object.entries(project?.floorMaps || {}).map(([floorId, map]) => [
      floorId,
      {
        ...map,
        imageUrl: toEditorAssetUrl(map.imageUrl),
      },
    ]),
  ),
});

const readPublishedProject = async () => {
  try {
    const response = await fetch(`/tour-output/data/project.json?t=${Date.now()}`);
    if (!response.ok) return null;
    const project = await response.json();
    return project?.scenes?.length ? preparePublishedProjectForEditor(project) : null;
  } catch (error) {
    console.warn(error);
    return null;
  }
};

const normalizeProjectScenes = (project) =>
  (project?.scenes || []).map((scene) => ({
    ...scene,
    imageUrl: pathOnlyAssetUrl(toEditorAssetUrl(scene.imageUrl), 'panoramas', scene.assetFileName, demoPanorama),
    thumbnailUrl: pathOnlyAssetUrl(toEditorAssetUrl(scene.thumbnailUrl), 'thumbs', scene.thumbnailFileName, pathOnlyAssetUrl(toEditorAssetUrl(scene.imageUrl), 'panoramas', scene.assetFileName, demoPanorama)),
    planetUrl: pathOnlyAssetUrl(toEditorAssetUrl(scene.planetUrl), 'planets', scene.planetFileName, ''),
    planetPreviewUrl: pathOnlyAssetUrl(toEditorAssetUrl(scene.planetPreviewUrl), 'planets', scene.planetPreviewFileName, ''),
    krpanoTiles: mapManualTileUrls(inferManualTiles(scene), toEditorAssetUrl),
    imageRoll: Number.isFinite(Number(scene.imageRoll)) ? Number(scene.imageRoll) : 0,
    imageDataUrl: null,
    hotspots: (scene.hotspots || []).map((hotspot) => ({
      ...hotspot,
      pitch: Number.isFinite(Number(hotspot.pitch)) ? Number(hotspot.pitch) : 0,
      size: Number.isFinite(Number(hotspot.size)) ? Number(hotspot.size) : 100,
    })),
    videoUrl: '',
    videoSpots: (scene.videoSpots || []).map((video) => ({
      ...video,
      pitch: Math.max(-65, Math.min(65, Number(video.pitch) || 0)),
      size: Math.max(10, Math.min(180, Number(video.size) || 100)),
      displayStyle: video.displayStyle === 'small' ? 'small' : 'large',
    })),
    animatedSpots: (scene.animatedSpots || []).map((spot) => ({
      ...spot,
      imageUrl: pathOnlyAssetUrl(toEditorAssetUrl(spot.imageUrl), 'animations', spot.assetFileName, ''),
      yaw: Math.max(-180, Math.min(180, Number(spot.yaw) || 0)),
      pitch: Math.max(-75, Math.min(75, Number(spot.pitch) || 0)),
      size: Math.max(10, Math.min(300, Number(spot.size) || 100)),
      rotation: Math.max(-180, Math.min(180, Number(spot.rotation) || 0)),
      playCount: Math.max(0, Math.min(10, Number(spot.playCount) || 0)),
    })),
  }));

const normalizeFloorMaps = (project) =>
  Object.fromEntries(
    Object.entries(project?.floorMaps || {}).map(([floorId, map]) => [
      floorId,
      {
        ...map,
        imageUrl: pathOnlyAssetUrl(toEditorAssetUrl(map.imageUrl), 'maps', map.assetFileName, ''),
        imageDataUrl: null,
      },
    ]),
  );

const normalizeProjectGroups = (project) =>
  (project?.groups?.length ? project.groups : campusGroups).map((group) => ({
    ...group,
    floors: (group.floors?.length ? group.floors : [{ id: `${group.id}-floor-1`, name: '1层', mapType: 'floor' }]).map(
      (floor) => ({
        mapType: 'floor',
        ...floor,
      }),
    ),
  }));

const createDefaultSceneForFloor = (group, floor, index = 1) => ({
  id: `${floor.id}-scene-${Date.now()}-${index}`,
  name: `${group.name} ${floor.name} 点位1`,
  groupId: group.id,
  floorId: floor.id,
  status: '待上传',
  imageUrl: demoPanorama,
  imageDataUrl: null,
  thumbnailUrl: demoPanorama,
  description: '',
  videoUrl: '',
  campusPosition: { x: 50, y: 50 },
  mapPosition: { x: 50, y: 50 },
  hotspots: [],
  videoSpots: [],
  animatedSpots: [],
  initialYaw: -24,
  initialPitch: 1,
  imageRoll: 0,
});

const ensureScenesForAllFloors = (groups, scenes) => {
  const nextScenes = [...scenes];
  groups.forEach((group) => {
    group.floors.forEach((floor, index) => {
      if (!nextScenes.some((scene) => scene.floorId === floor.id)) {
        nextScenes.push(createDefaultSceneForFloor(group, floor, index + 1));
      }
    });
  });
  return nextScenes;
};

const writeFileToDirectory = async (directoryHandle, name, content) => {
  const fileHandle = await directoryHandle.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};

const writePublishedFolder = async (directoryHandle, packageFiles) => {
  const root = await directoryHandle.getDirectoryHandle('taian-campus-360-tour', { create: true });
  const data = await root.getDirectoryHandle('data', { create: true });
  const assets = await root.getDirectoryHandle('assets', { create: true });
  await writeFileToDirectory(root, 'index.html', packageFiles.html);
  await writeFileToDirectory(assets, 'tour.css', packageFiles.css);
  await writeFileToDirectory(assets, 'tour.js', packageFiles.js);
  await writeFileToDirectory(data, 'project.json', packageFiles.projectJson);
  await writeFileToDirectory(
    root,
    'README.txt',
    'Open index.html to browse the generated school 360 tour. data/project.json contains the saved scenes, floor maps, positions, hotspots, video spots and panorama image data.',
  );
};

function App() {
  const [groups, setGroups] = useState(campusGroups);
  const [scenes, setScenes] = useState(initialScenes);
  const [activeSceneId, setActiveSceneId] = useState(initialScenes[0].id);
  const [activeHotspotId, setActiveHotspotId] = useState(initialScenes[0].hotspots[0]?.id);
  const [activeVideoId, setActiveVideoId] = useState(initialScenes[0].videoSpots?.[0]?.id);
  const [activeAnimatedSpotId, setActiveAnimatedSpotId] = useState(initialScenes[0].animatedSpots?.[0]?.id);
  const [floorMaps, setFloorMaps] = useState({});
  const [quickLinks, setQuickLinks] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(390);
  const [inspectorWidth, setInspectorWidth] = useState(390);
  const [sceneTreeHeight, setSceneTreeHeight] = useState(sceneTreeMinHeight);
  const [publishState, setPublishState] = useState('鏈湴缂栬緫');
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('split');
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  const panoramaInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const currentViewRef = useRef({
    yaw: initialScenes[0].initialYaw ?? -24,
    pitch: initialScenes[0].initialPitch ?? 1,
  });
  const [currentView, setCurrentView] = useState(currentViewRef.current);

  const activeScene = useMemo(
    () => scenes.find((scene) => scene.id === activeSceneId) || scenes[0],
    [activeSceneId, scenes],
  );
  const activeGroup = groups.find((group) => group.id === activeScene.groupId) || groups[0];
  const activeFloor = activeGroup.floors.find((floor) => floor.id === activeScene.floorId) || activeGroup.floors[0];
  const activeHotspot = activeScene.hotspots.find((hotspot) => hotspot.id === activeHotspotId) || activeScene.hotspots[0];
  const activeVideoSpot =
    (activeScene.videoSpots || []).find((video) => video.id === activeVideoId) || activeScene.videoSpots?.[0];
  const activeAnimatedSpot =
    (activeScene.animatedSpots || []).find((spot) => spot.id === activeAnimatedSpotId) || activeScene.animatedSpots?.[0];
  const sceneGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        floors: group.floors.map((floor) => ({
          ...floor,
          scenes: scenes.filter((scene) => scene.floorId === floor.id),
        })),
      })),
    [groups, scenes],
  );

  const startResize = (type, event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startSidebarWidth = sidebarWidth;
    const startInspectorWidth = inspectorWidth;
    const startSceneTreeHeight = sceneTreeHeight;

    const onMove = (moveEvent) => {
      if (type === 'sidebar') {
        setSidebarWidth(Math.max(320, Math.min(620, startSidebarWidth + moveEvent.clientX - startX)));
      }
      if (type === 'inspector') {
        setInspectorWidth(Math.max(320, Math.min(640, startInspectorWidth - (moveEvent.clientX - startX))));
      }
      if (type === 'scene-tree') {
        setSceneTreeHeight(
          Math.max(sceneTreeMinHeight, Math.min(window.innerHeight * 1.5, startSceneTreeHeight + moveEvent.clientY - startY)),
        );
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      document.body.classList.remove('is-resizing');
    };

    document.body.classList.add('is-resizing');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  const patchActiveScene = useCallback(
    (updater) => {
      setScenes((current) =>
        current.map((scene) => (scene.id === activeSceneId ? { ...scene, ...updater(scene) } : scene)),
      );
      setPublishState('鏈夋湭鍙戝竷鏇存敼');
    },
    [activeSceneId],
  );

  
  
  const handlePanoramaUpload = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
      if (!files.length) return;

      const usedSceneIds = new Set();
      const uploadTasks = files.map((file) => {
        const targetScene =
          files.length === 1
            ? activeScene
            : findSceneByPanoramaFile(file, scenes, usedSceneIds);
        if (targetScene) usedSceneIds.add(targetScene.id);
        return { file, scene: targetScene };
      });
      const unmatched = uploadTasks.filter((task) => !task.scene).map((task) => task.file.name);
      const matchedTasks = uploadTasks.filter((task) => task.scene);

      if (!matchedTasks.length) {
        setPublishState('未找到可匹配的场景');
        window.alert(`没有匹配到场景，请检查文件名是否包含场景名称。\n未匹配：${unmatched.join('、')}`);
        event.target.value = '';
        return;
      }

      const shouldSplit = uploadMode === 'split';
      setPublishState(`正在批量上传${shouldSplit ? '并切六面图' : '单张全景图'} 0/${matchedTasks.length}`);
      try {
        const patches = [];
        for (let index = 0; index < matchedTasks.length; index += 1) {
          const { file, scene } = matchedTasks[index];
          setPublishState(`正在处理 ${index + 1}/${matchedTasks.length}：${scene.name}`);
          const uploaded = shouldSplit
            ? await uploadPanoramaAndSplit(file, scene.id, file.name)
            : await uploadAssetFile(file, 'panoramas', `${scene.id}-${file.name}`, { stable: true });
          let thumbnailUrl = uploaded.url;
          let thumbnailFileName = null;
          try {
            const thumbnail = await createImageThumbnail(file);
            const thumbName = `${scene.id}-thumb.webp`;
            const uploadedThumb = await uploadAssetFile(thumbnail, 'thumbs', thumbName, { stable: true });
            thumbnailUrl = uploadedThumb.url;
            thumbnailFileName = thumbName;
          } catch (error) {
            console.warn(error);
          }
          patches.push({
            sceneId: scene.id,
            patch: {
              imageUrl: uploaded.url,
              imageDataUrl: null,
              thumbnailUrl,
              thumbnailFileName,
              assetFileName: uploaded.filename || file.name,
              imageMode: shouldSplit ? 'manualTiles' : 'single',
              krpanoTiles: shouldSplit ? uploaded.manualTiles || createManualTiles(scene) : null,
              tileFolder: shouldSplit ? uploaded.manualTiles?.tileBaseUrl || '' : '',
              status: '已上传',
              name: scene.status === '待上传' && files.length === 1 ? file.name.replace(/\.[^.]+$/, '') : scene.name,
            },
          });
        }

        setScenes((current) =>
          current.map((scene) => {
            const item = patches.find((entry) => entry.sceneId === scene.id);
            return item ? { ...scene, ...item.patch } : scene;
          }),
        );
        setActiveSceneId(patches[0].sceneId);
        setPublishState(`批量处理完成：${patches.length}/${files.length}`);
        const unmatchedText = unmatched.length ? `\n未匹配 ${unmatched.length} 个文件：${unmatched.join('、')}` : '';
        window.alert(`文件处理完成，已按“${shouldSplit ? '切六面图' : '单张全景图'}”模式上传 ${patches.length} 个。${unmatchedText}`);
      } catch (error) {
        console.error(error);
        setPublishState(error instanceof Error ? error.message : '全景图上传或切图失败');
      } finally {
        event.target.value = '';
      }
    },
    [activeScene, scenes, uploadMode],
  );

  const handleFloorMapUpload = useCallback(async (floorId, file) => {
    if (!file) return;
    setPublishState('正在上传平面图...');
    try {
      const uploaded = await uploadAssetFile(file, 'maps', `${floorId}-${file.name}`, { stable: true });
      setFloorMaps((current) => ({
        ...current,
        [floorId]: {
          name: file.name,
          imageUrl: uploaded.url,
          imageDataUrl: null,
          assetFileName: uploaded.filename || file.name,
        },
      }));
            setPublishState('平面图已上传');
    } catch (error) {
      console.error(error);
      setPublishState(error instanceof Error ? error.message : '平面图上传失败');
    }
  }, []);

  const selectScene = (sceneId) => {
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    setActiveSceneId(scene.id);
    setActiveHotspotId(scene.hotspots[0]?.id);
    setActiveVideoId(scene.videoSpots?.[0]?.id);
    setActiveAnimatedSpotId(scene.animatedSpots?.[0]?.id);
    const nextView = { yaw: scene.initialYaw ?? -24, pitch: scene.initialPitch ?? 1 };
    currentViewRef.current = nextView;
    setCurrentView(nextView);
  };

  const deleteScene = (sceneId) => {
    const scene = scenes.find((item) => item.id === sceneId);
    if (!scene) return;
    if (scenes.length <= 1) {
      window.alert('至少需要保留一个场景。');
      return;
    }
    if (!window.confirm(`确定删除场景“${scene.name}”吗？`)) return;

    const nextScene = scenes.find((item) => item.id !== sceneId);
    setScenes((current) =>
      current
        .filter((item) => item.id !== sceneId)
        .map((item) => ({
          ...item,
          hotspots: (item.hotspots || []).filter((hotspot) => hotspot.targetSceneId !== sceneId),
        })),
    );

    if (activeSceneId === sceneId && nextScene) {
      setActiveSceneId(nextScene.id);
      setActiveHotspotId(nextScene.hotspots?.[0]?.id);
      setActiveVideoId(nextScene.videoSpots?.[0]?.id);
      setActiveAnimatedSpotId(nextScene.animatedSpots?.[0]?.id);
      const nextView = { yaw: nextScene.initialYaw ?? -24, pitch: nextScene.initialPitch ?? 1 };
      currentViewRef.current = nextView;
      setCurrentView(nextView);
    }
    setPublishState('已有未发布更改');
  };

  const addScene = () => {
    const sceneCount = scenes.filter((scene) => scene.floorId === activeFloor.id).length + 1;
    const nextScene = {
      id: `scene-${Date.now()}`,
      name: `${activeGroup.name} ${activeFloor.name} 点位${sceneCount}`,
      groupId: activeGroup.id,
      floorId: activeFloor.id,
      status: '待上传',
      imageUrl: demoPanorama,
      imageDataUrl: null,
      description: '',
      videoUrl: '',
      campusPosition: { ...activeScene.campusPosition },
      mapPosition: { x: 50, y: 50 },
      hotspots: [],
      videoSpots: [],
      animatedSpots: [],
    };
    setScenes((current) => [...current, nextScene]);
    setActiveSceneId(nextScene.id);
    setActiveHotspotId(undefined);
    setActiveVideoId(undefined);
    setActiveAnimatedSpotId(undefined);
    setPublishState('有未发布更改');
  };


  const addSceneGroup = () => {
    const nextIndex = groups.length + 1;
    const groupName = `大场景 ${nextIndex}`;
    const groupId = `group-${Date.now()}`;
    const floorId = `${groupId}-floor-1`;
    const nextGroup = {
      id: groupId,
      name: groupName,
      floors: [{ id: floorId, name: '1层', mapType: 'floor', variant: 'linear-upper' }],
    };
    const nextScene = {
      id: `${groupId}-scene-1`,
      name: `${nextGroup.name} 1层点位`,
      groupId,
      floorId,
      status: '待上传',
      imageUrl: demoPanorama,
      imageDataUrl: null,
      description: '',
      videoUrl: '',
      campusPosition: { x: 50, y: 50 },
      mapPosition: { x: 50, y: 50 },
      hotspots: [],
      videoSpots: [],
      animatedSpots: [],
      initialYaw: -24,
      initialPitch: 1,
      imageRoll: 0,
    };
    setGroups((current) => [...current, nextGroup]);
    setScenes((current) => [...current, nextScene]);
    setActiveSceneId(nextScene.id);
    setActiveHotspotId(undefined);
    setActiveVideoId(undefined);
    setActiveAnimatedSpotId(undefined);
    currentViewRef.current = { yaw: nextScene.initialYaw, pitch: nextScene.initialPitch };
    setCurrentView(currentViewRef.current);
    setPublishState('有未发布更改');
  };

  const addFloor = () => {
    const floorCount = activeGroup.floors.length + 1;
    const floorName = `${floorCount}层`;

    const floorId = `${activeGroup.id}-floor-${Date.now()}`;
    const nextFloor = {
      id: floorId,
      name: floorName,
      mapType: activeGroup.id === 'outdoor' ? 'campus' : 'floor',
      variant: activeFloor.variant || 'linear-upper',
    };
    const nextScene = {
      id: `${floorId}-scene-1`,
      name: `${activeGroup.name} ${nextFloor.name} 点位1`,
      groupId: activeGroup.id,
      floorId,
      status: '待上传',
      imageUrl: demoPanorama,
      imageDataUrl: null,
      description: '',
      videoUrl: '',
      campusPosition: { ...activeScene.campusPosition },
      mapPosition: { x: 50, y: 50 },
      hotspots: [],
      videoSpots: [],
      animatedSpots: [],
      initialYaw: -24,
      initialPitch: 1,
      imageRoll: 0,
    };

    setGroups((current) =>
      current.map((group) =>
        group.id === activeGroup.id
          ? { ...group, floors: [...group.floors, nextFloor] }
          : group,
      ),
    );
    setScenes((current) => [...current, nextScene]);
    setActiveSceneId(nextScene.id);
    setActiveHotspotId(undefined);
    setActiveVideoId(undefined);
    setActiveAnimatedSpotId(undefined);
    currentViewRef.current = { yaw: nextScene.initialYaw, pitch: nextScene.initialPitch };
    setCurrentView(currentViewRef.current);
    setPublishState('有未发布更改');
  };

  const addHotspot = () => {
    const targetScene = scenes.find((scene) => scene.id !== activeScene.id) || scenes[0];
    const nextHotspot = {
      id: `hotspot-${Date.now()}`,
      label: `前往${targetScene.name}`,
      yaw: 0,
      pitch: 0,
      size: 100,
      targetSceneId: targetScene.id,
    };
    patchActiveScene((scene) => ({ hotspots: [...scene.hotspots, nextHotspot] }));
    setActiveHotspotId(nextHotspot.id);
  };

  const addVideoSpot = () => {
    const nextVideo = {
      id: `video-${Date.now()}`,
      label: '视频介绍',
      yaw: 0,
      pitch: 0,
      url: '',
      size: 100,
      displayStyle: 'large',
    };
    patchActiveScene((scene) => ({ videoSpots: [...(scene.videoSpots || []), nextVideo] }));
    setActiveVideoId(nextVideo.id);
  };

  const updateHotspot = (hotspotId, patch) => {
    patchActiveScene((scene) => ({
      hotspots: scene.hotspots.map((hotspot) =>
        hotspot.id === hotspotId ? { ...hotspot, ...patch } : hotspot,
      ),
    }));
  };

  const deleteHotspot = () => {
    if (!activeHotspot) return;
    patchActiveScene((scene) => ({ hotspots: scene.hotspots.filter((hotspot) => hotspot.id !== activeHotspot.id) }));
    setActiveHotspotId(activeScene.hotspots.find((hotspot) => hotspot.id !== activeHotspot.id)?.id);
  };

  const updateVideoSpot = (videoId, patch) => {
    patchActiveScene((scene) => ({
      videoSpots: (scene.videoSpots || []).map((video) =>
        video.id === videoId
          ? {
              ...video,
              ...patch,
              pitch: Math.max(-65, Math.min(65, Number(patch.pitch ?? video.pitch ?? 0) || 0)),
              size: Math.max(10, Math.min(180, Number(patch.size ?? video.size ?? 100) || 100)),
              displayStyle: (patch.displayStyle ?? video.displayStyle) === 'small' ? 'small' : 'large',
            }
          : video,
      ),
    }));
  };

  const deleteVideoSpot = () => {
    if (!activeVideoSpot) return;
    patchActiveScene((scene) => ({ videoSpots: (scene.videoSpots || []).filter((video) => video.id !== activeVideoSpot.id) }));
    setActiveVideoId(activeScene.videoSpots?.find((video) => video.id !== activeVideoSpot.id)?.id);
  };

  const addAnimatedSpot = () => {
    const nextSpot = {
      id: `animation-${Date.now()}`,
      name: '动态贴图',
      imageUrl: '',
      assetFileName: '',
      yaw: currentViewRef.current.yaw || 0,
      pitch: currentViewRef.current.pitch || 0,
      size: 100,
      rotation: 0,
      playCount: 0,
    };
    patchActiveScene((scene) => ({ animatedSpots: [...(scene.animatedSpots || []), nextSpot] }));
    setActiveAnimatedSpotId(nextSpot.id);
  };

  const updateAnimatedSpot = (spotId, patch) => {
    patchActiveScene((scene) => ({
      animatedSpots: (scene.animatedSpots || []).map((spot) =>
        spot.id === spotId
          ? {
              ...spot,
              ...patch,
              yaw: Math.max(-180, Math.min(180, Number(patch.yaw ?? spot.yaw ?? 0) || 0)),
              pitch: Math.max(-75, Math.min(75, Number(patch.pitch ?? spot.pitch ?? 0) || 0)),
              size: Math.max(10, Math.min(300, Number(patch.size ?? spot.size ?? 100) || 100)),
              rotation: Math.max(-180, Math.min(180, Number(patch.rotation ?? spot.rotation ?? 0) || 0)),
              playCount: Math.max(0, Math.min(10, Number(patch.playCount ?? spot.playCount ?? 0) || 0)),
            }
          : spot,
      ),
    }));
  };

  const deleteAnimatedSpot = () => {
    if (!activeAnimatedSpot) return;
    patchActiveScene((scene) => ({
      animatedSpots: (scene.animatedSpots || []).filter((spot) => spot.id !== activeAnimatedSpot.id),
    }));
    setActiveAnimatedSpotId(activeScene.animatedSpots?.find((spot) => spot.id !== activeAnimatedSpot.id)?.id);
  };

  const uploadAnimatedSpot = async (spotId, file) => {
    if (!file) return;
    if (!/\.(gif|webp)$/i.test(file.name) && !['image/gif', 'image/webp'].includes(file.type)) {
      window.alert('仅支持 GIF 或动态 WebP 文件。');
      return;
    }
    setPublishState('正在上传动态贴图');
    try {
      const uploaded = await uploadAssetFile(file, 'animations', `${activeScene.id}-${spotId}-${file.name}`);
      updateAnimatedSpot(spotId, {
        name: file.name.replace(/\.[^.]+$/, '') || '动态贴图',
        imageUrl: uploaded.url,
        assetFileName: uploaded.filename || file.name,
      });
      setPublishState('动态贴图已上传');
    } catch (error) {
      console.error(error);
      setPublishState(error instanceof Error ? error.message : '动态贴图上传失败');
    }
  };

  const addQuickLink = () => {
    const targetScene = activeScene || scenes[0];
    const id = `quick-${Date.now()}`;
    setQuickLinks((current) => [
      ...current,
      {
        id,
        label: targetScene?.name || `弹窗按钮 ${current.length + 1}`,
        targetSceneId: targetScene?.id || '',
        action: 'modal',
      },
    ]);
    setPublishState('有未发布更改');
    return id;
  };

  const updateQuickLink = (linkId, patch) => {
    setQuickLinks((current) => current.map((link) => (link.id === linkId ? { ...link, ...patch } : link)));
    setPublishState('有未发布更改');
  };

  const deleteQuickLink = (linkId) => {
    setQuickLinks((current) => current.filter((link) => link.id !== linkId));
    setPublishState('有未发布更改');
  };

  const updateSceneMapPosition = (position) => {
    patchActiveScene(() => ({
      mapPosition: position,
      campusPosition: activeFloor.mapType === 'campus' ? position : activeScene.campusPosition,
    }));
  };

  const normalizeYaw = (yaw) => {
    const value = Number.isFinite(yaw) ? yaw : -24;
    return ((((value + 180) % 360) + 360) % 360) - 180;
  };

  const handleViewChange = useCallback((view) => {
    const nextView = {
      yaw: normalizeYaw(view.yaw),
      pitch: Math.max(-78, Math.min(78, Number.isFinite(view.pitch) ? view.pitch : 1)),
    };
    currentViewRef.current = nextView;
    setCurrentView(nextView);
  }, []);

  const updateFirstView = (patch) => {
    const nextView = {
      yaw: normalizeYaw(patch.yaw ?? activeScene.initialYaw ?? currentViewRef.current.yaw ?? -24),
      pitch: Math.max(
        -78,
        Math.min(78, Number.isFinite(patch.pitch) ? patch.pitch : activeScene.initialPitch ?? currentViewRef.current.pitch ?? 1),
      ),
    };
    currentViewRef.current = nextView;
    setCurrentView(nextView);
    patchActiveScene(() => ({
      initialYaw: Number(nextView.yaw.toFixed(2)),
      initialPitch: Number(nextView.pitch.toFixed(2)),
    }));
  };

  const updateImageRoll = (value) => {
    const roll = Math.max(-180, Math.min(180, Number.isFinite(value) ? value : 0));
    patchActiveScene(() => ({ imageRoll: Number(roll.toFixed(2)) }));
  };

  const saveFirstView = () => {
    const nextView = currentViewRef.current;
    patchActiveScene(() => ({
      initialYaw: Number(nextView.yaw.toFixed(2)),
      initialPitch: Number(nextView.pitch.toFixed(2)),
    }));
    setPublishState(`已设置第一视角：${Math.round(nextView.yaw)}°`);
  };

  
  
  
  
  const serializeProject = async () => {
    const pathOnlyScenes = scenes.map((scene) => {
      const imageUrl = pathOnlyAssetUrl(scene.imageUrl, 'panoramas', scene.assetFileName, demoPanorama);
      return {
        ...scene,
        imageUrl,
        imageDataUrl: null,
        thumbnailUrl: pathOnlyAssetUrl(scene.thumbnailUrl, 'thumbs', scene.thumbnailFileName, imageUrl),
        planetUrl: pathOnlyAssetUrl(scene.planetUrl, 'planets', scene.planetFileName, ''),
        planetPreviewUrl: pathOnlyAssetUrl(scene.planetPreviewUrl, 'planets', scene.planetPreviewFileName, ''),
        krpanoTiles: mapManualTileUrls(inferManualTiles(scene), toPackageAssetUrl),
        hotspots: (scene.hotspots || []).map((hotspot) => ({
          ...hotspot,
          pitch: Math.max(-65, Math.min(65, Number(hotspot.pitch) || 0)),
          size: Math.max(70, Math.min(180, Number(hotspot.size) || 100)),
        })),
        videoSpots: (scene.videoSpots || []).map((video) => ({
          ...video,
          pitch: Math.max(-65, Math.min(65, Number(video.pitch) || 0)),
          size: Math.max(10, Math.min(180, Number(video.size) || 100)),
          displayStyle: video.displayStyle === 'small' ? 'small' : 'large',
        })),
        animatedSpots: (scene.animatedSpots || []).map((spot) => ({
          ...spot,
          imageUrl: toPackageAssetUrl(pathOnlyAssetUrl(spot.imageUrl, 'animations', spot.assetFileName, '')),
          yaw: Math.max(-180, Math.min(180, Number(spot.yaw) || 0)),
          pitch: Math.max(-75, Math.min(75, Number(spot.pitch) || 0)),
          size: Math.max(10, Math.min(300, Number(spot.size) || 100)),
          rotation: Math.max(-180, Math.min(180, Number(spot.rotation) || 0)),
          playCount: Math.max(0, Math.min(10, Number(spot.playCount) || 0)),
        })),
      };
    });
    const sceneNameById = new Map(pathOnlyScenes.map((scene) => [scene.id, scene.name || '']));
    const sceneIdByName = (namePart) =>
      pathOnlyScenes.find((scene) => String(scene.name || '').includes(namePart))?.id;
    const repairedScenes = pathOnlyScenes.map((scene) => ({
      ...scene,
      hotspots: (scene.hotspots || []).map((hotspot) => {
        const label = String(hotspot.label || '');
        const targetName = sceneNameById.get(hotspot.targetSceneId) || '';
        if ((label.includes('北小门') || label.includes('北校门')) && !targetName.includes('北')) {
          return { ...hotspot, targetSceneId: sceneIdByName('北小门') || sceneIdByName('北校门') || hotspot.targetSceneId };
        }
        if (label.includes('阶梯教室') && targetName.includes('停车场')) {
          return { ...hotspot, targetSceneId: sceneIdByName('阶梯教室外') || sceneIdByName('阶梯教室') || hotspot.targetSceneId };
        }
        if (label.includes('西北角') && sceneIdByName('西北角') && !targetName.includes('西北角')) {
          return { ...hotspot, targetSceneId: sceneIdByName('西北角') };
        }
        return hotspot;
      }),
    }));
    const pathOnlyFloorMaps = Object.fromEntries(
      Object.entries(floorMaps || {}).map(([floorId, map]) => [
        floorId,
        {
          ...map,
          imageUrl: pathOnlyAssetUrl(map?.imageUrl, 'maps', map?.assetFileName, ''),
          imageDataUrl: null,
        },
      ]),
    );
    return {
      projectName: '泰安中公学习基地360全景展示',
      generatedAt: new Date().toISOString(),
      activeSceneId: pathOnlyScenes.some((scene) => scene.id === 'outdoor-gate')
        ? 'outdoor-gate'
        : pathOnlyScenes[0]?.id || activeSceneId,
      groups,
      floorMaps: pathOnlyFloorMaps,
      scenes: repairedScenes,
      quickLinks: (quickLinks || [])
        .filter((link) => link?.targetSceneId && pathOnlyScenes.some((scene) => scene.id === link.targetSceneId))
        .map((link) => ({
          id: link.id || `quick-${Date.now()}`,
          label: link.label || sceneNameById.get(link.targetSceneId) || '弹窗按钮',
          targetSceneId: link.targetSceneId,
          action: link.action === 'navigate' ? 'navigate' : 'modal',
        })),
    };
  };

  const restoreProjectToEditor = (project, message = 'Loaded project') => {
    if (!project?.scenes?.length) return false;
    const restoredGroups = normalizeProjectGroups(project);
    const restoredScenes = ensureScenesForAllFloors(restoredGroups, normalizeProjectScenes(project));
    const restoredActiveScene = restoredScenes.find((scene) => scene.id === project.activeSceneId) || restoredScenes[0];
    setGroups(restoredGroups);
    setScenes(restoredScenes);
    setFloorMaps(normalizeFloorMaps(project));
    setQuickLinks(
      (project.quickLinks || []).map((link, index) => ({
        id: link.id || `quick-${index + 1}`,
        label: link.label || '弹窗按钮',
        targetSceneId: link.targetSceneId || '',
        action: link.action === 'navigate' ? 'navigate' : 'modal',
      })),
    );
    setActiveSceneId(restoredActiveScene.id);
    setActiveHotspotId(restoredActiveScene.hotspots?.[0]?.id);
    setActiveVideoId(restoredActiveScene.videoSpots?.[0]?.id);
    setActiveAnimatedSpotId(restoredActiveScene.animatedSpots?.[0]?.id);
    currentViewRef.current = {
      yaw: restoredActiveScene.initialYaw ?? -24,
      pitch: restoredActiveScene.initialPitch ?? 1,
    };
    setCurrentView(currentViewRef.current);
    if (message !== null) setPublishState(message);
    return true;
  };

  useEffect(() => {
    let cancelled = false;

    readLocalProject()
      .then((project) => {
        if (cancelled) return;

        if (project?.scenes?.length) restoreProjectToEditor(project, '已加载本地发布数据');

        setIsProjectLoaded(true);
      })
      .catch((error) => {
        console.error(error);
        setIsProjectLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProjectLoaded) return undefined;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const needsCompaction =
        scenes.some(
          (scene) =>
            scene.imageDataUrl ||
            scene.imageUrl?.startsWith('data:') ||
            scene.thumbnailUrl?.startsWith('data:'),
        ) ||
        Object.values(floorMaps || {}).some((map) => map?.imageDataUrl || map?.imageUrl?.startsWith('data:'));
      serializeProject()
        .then(async (project) => {
          await writeLocalProject(project);
          if (needsCompaction) restoreProjectToEditor(project, null);
        })
        .catch(console.error);
    }, 450);
    return () => window.clearTimeout(saveTimerRef.current);
  }, [groups, scenes, activeSceneId, floorMaps, quickLinks, isProjectLoaded]);

  useEffect(() => {
    if (!isProjectLoaded || !groups.length) return;
    const nextScenes = ensureScenesForAllFloors(groups, scenes);
    if (nextScenes.length === scenes.length) return;
    setScenes(nextScenes);
    setPublishState('已为空楼层添加默认点位');
  }, [groups, scenes, isProjectLoaded]);

  const publishPreview = async () => {
    setIsPublishing(true);
    try {
      const project = await serializeProject();
      await writeLocalProject(project);
      restoreProjectToEditor(project, 'Saved compact project data');
      const url = `${window.location.origin}${previewPath}`;
      setPreviewUrl(url);
      setPublishState('已生成浏览页');
      window.open(url, '_blank');
    } finally {
      setIsPublishing(false);
    }
  };

  const writeTourSource = async (project, { openFolder = false } = {}) => {
    const response = await fetch('/api/write-tour-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createStandalonePackage(project), openFolder }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '\u6e90\u6587\u4ef6\u8f93\u51fa\u5931\u8d25');
    }
    return response.json();
  };

  const loadPublishedProject = async () => {
    setIsPublishing(true);
    try {
      const project = await readPublishedProject();
      if (!project?.scenes?.length) {
        setPublishState('No published project found');
        return;
      }
      restoreProjectToEditor(project, 'Loaded published page data');
      await writeLocalProject(project);
      setPreviewUrl(`${window.location.origin}/tour-output/index.html?t=${Date.now()}`);
    } catch (error) {
      console.error(error);
      setPublishState(error instanceof Error ? error.message : 'Load published project failed');
    } finally {
      setIsPublishing(false);
    }
  };

  const saveConfiguration = async () => {
    setIsPublishing(true);
    try {
      const project = await serializeProject();
      await writeLocalProject(project);
      const result = await writeTourSource(project, { openFolder: false });
      restoreProjectToEditor(project, '配置已保存');
      setPreviewUrl(`${window.location.origin}${result.url}?t=${Date.now()}`);
      setPublishState('配置和浏览源文件已更新，可点击“下载浏览源文件”');
    } catch (error) {
      console.error(error);
      setPublishState(error instanceof Error ? error.message : '\u4fdd\u5b58\u914d\u7f6e\u5931\u8d25');
    } finally {
      setIsPublishing(false);
    }
  };

  const downloadSourceFiles = async () => {
    setIsPublishing(true);
    try {
      const project = await serializeProject();
      await writeLocalProject(project);
      const result = await writeTourSource(project, { openFolder: false });
      const link = document.createElement('a');
      link.href = `/api/download-tour-source?t=${Date.now()}`;
      link.download = `school-panorama-tour-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      restoreProjectToEditor(project, '浏览源文件开始下载');
      const url = `${window.location.origin}${result.url}?t=${Date.now()}`;
      setPreviewUrl(url);
      setPublishState('正在生成并下载浏览源文件 ZIP');
    } catch (error) {
      console.error(error);
      setPublishState(error instanceof Error ? error.message : '浏览源文件下载失败');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="app-shell">
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <div className="brand">
          <div className="brand-mark">
            <Building2 size={23} />
          </div>
          <div>
            <h1>泰安基地360全景发布器</h1>
            <p>蓝色主题 · 简约平面图 · 场景跳转 · 视频播放</p>
          </div>
        </div>

        <section className="panel upload-panel">
          <div className="panel-heading">
            <span>当前点位全景图</span>
            <FileImage size={18} />
          </div>
          <div className="upload-mode-switch" role="group" aria-label="全景图上传处理方式">
            <button
              className={uploadMode === 'split' ? 'is-active' : ''}
              type="button"
              aria-pressed={uploadMode === 'split'}
              onClick={() => setUploadMode('split')}
            >
              切六面图
            </button>
            <button
              className={uploadMode === 'single' ? 'is-active' : ''}
              type="button"
              aria-pressed={uploadMode === 'single'}
              onClick={() => setUploadMode('single')}
            >
              单张全景图
            </button>
          </div>
          <button className="upload-drop" type="button" onClick={() => panoramaInputRef.current?.click()}>
            <ImagePlus size={28} />
            <strong>上传 360 全景图</strong>
            <span>
              {uploadMode === 'split'
                ? '上传后自动切为六面 WebP；批量时按文件名匹配场景'
                : '保留单张 360 全景图；批量时按文件名匹配场景'}
            </span>
          </button>
          <input ref={panoramaInputRef} type="file" accept="image/*" multiple onChange={handlePanoramaUpload} hidden />
          <div className="upload-meta">
            <span>{activeGroup.name} / {activeFloor.name}</span>
            <strong>{activeScene.status}</strong>
          </div>
        </section>

        <section className="panel scene-details-panel">
          <div className="panel-heading">
            <span>场景信息与视频</span>
            <FileImage size={18} />
          </div>
          <SceneEditor scene={activeScene} onChange={(patch) => patchActiveScene(() => patch)} />
        </section>
        <section className="panel map-panel-sidebar">
          <div className="panel-heading">
            <span>简约平面图</span>
            <MapPinned size={18} />
          </div>
          <MapPanel
            activeFloor={activeFloor}
            floorMap={floorMaps[activeFloor.id]}
            scenes={scenes}
            activeScene={activeScene}
            onSelectScene={selectScene}
            onUpdatePosition={updateSceneMapPosition}
            onUploadMap={handleFloorMapUpload}
          />
        </section>

        <QuickLinkPanel
          quickLinks={quickLinks}
          scenes={scenes}
          onAdd={addQuickLink}
          onUpdate={updateQuickLink}
          onDelete={deleteQuickLink}
        />
        <AnimatedSpotPanel
          spots={activeScene.animatedSpots || []}
          activeSpot={activeAnimatedSpot}
          onAdd={addAnimatedSpot}
          onSelect={setActiveAnimatedSpotId}
          onUpdate={updateAnimatedSpot}
          onUpload={uploadAnimatedSpot}
          onDelete={deleteAnimatedSpot}
        />
      </aside>

      <section className="workspace">
        <header className="topbar">        
                  <div>        
                    <span className="caption">当前编辑点位</span>
                    <h2>{activeScene.name}</h2>        
                  </div>        
                  <div className="topbar-actions">        
                    <span className={`publish-state ${publishState === '已生成浏览页' ? 'is-ready' : ''}`}>
                      {publishState === '已生成浏览页' ? <CheckCircle2 size={16} /> : <Upload size={16} />}
                      {isPublishing ? '正在生成浏览页' : publishState}
                    </span>        
                                <button className="secondary-button" type="button" onClick={loadPublishedProject} disabled={isPublishing}>        
                      <Upload size={17} />        
                      加载发布数据
                    </button>        
        <button className="secondary-button" type="button" onClick={saveConfiguration}>        
                      <Save size={17} />        
                      保存配置
                    </button>        
                    <button className="primary-button" type="button" onClick={publishPreview} disabled={isPublishing}>        
                      <Eye size={17} />        
                      发布浏览
                    </button>        
                    <button className="secondary-button" type="button" onClick={downloadSourceFiles} disabled={isPublishing}>
                      <Download size={17} />
                      下载浏览源文件
                    </button>        
                  </div>        
                </header>

        {previewUrl ? (        
                  <a className="preview-link" href={previewUrl} target="_blank" rel="noreferrer">        
                    <Link2 size={16} />        
                    浏览页地址：{previewUrl}
                  </a>        
                ) : null}

        <div className="center-stack">
                <section className="panel tree-panel" style={{ height: sceneTreeHeight }}>        
                  <div className="panel-heading">        
                    <span>场景管理</span>
                    <div className="heading-actions">        
                      <button className="mini-action-button" type="button" onClick={addSceneGroup}>        
                        <Plus size={14} />        
                        添加大场景
                      </button>

                      <button className="mini-action-button" type="button" onClick={addFloor}>
                        <Plus size={14} />
                        添加楼层
                      </button>
                      <button className="icon-button" type="button" onClick={addScene} aria-label="添加场景" title="添加场景">
                        <Plus size={17} />        
                      </button>        
                    </div>        
                  </div>        
                  <div className="scene-tree">        
                    {sceneGroups.map((group) => (        
                      <div className="scene-group" key={group.id}>        
                        <div className="scene-group-title">{group.name}</div>        
                        {group.floors.map((floor) => (        
                          <div className="floor-block" key={floor.id}>        
                            <div className="floor-title">{floor.name}</div>        
                            {floor.scenes.length === 0 ? <div className="empty-floor">暂无点位</div> : null}
                            {floor.scenes.map((scene) => (        
                              <div
                                className={`scene-row ${scene.id === activeSceneId ? 'is-selected' : ''}`}        
                                role="button"
                                key={scene.id}        
                                tabIndex={0}
                                onClick={() => selectScene(scene.id)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') selectScene(scene.id);
                                }}
                              >        
                                <span
                                  className="scene-thumb"
                                  style={{
                                    backgroundImage: `url(${scene.thumbnailUrl || (scene.imageUrl?.startsWith('data:') ? demoPanorama : scene.imageUrl)})`,
                                  }}
                                />
                                <span>        
                                  <strong>{scene.name}</strong>        
                                  <small>{scene.status}</small>        
                                </span>        
                                <button
                                  className="scene-delete-button"
                                  type="button"
                                  title="删除场景"
                                  aria-label={`删除场景 ${scene.name}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    deleteScene(scene.id);
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}        
                          </div>        
                        ))}        
                      </div>        
                    ))}        
                  </div>        
                  <div        
                    className="panel-height-resizer"        
                    role="separator"        
                    aria-label="调整场景管理高度"
                    onPointerDown={(event) => startResize('scene-tree', event)}        
                  />        
                </section>        
                
                  </div>

      <section className="bottom-workspace">
        <div className="viewer-column">
        <div className="viewer-shell">
                    <PanoramaViewer
                      imageUrl={activeScene.imageUrl}
                      krpanoTiles={activeScene.krpanoTiles}
                      hotspots={activeScene.hotspots}
                      videoSpots={activeScene.videoSpots || []}
                      animatedSpots={activeScene.animatedSpots || []}
                      activeHotspotId={activeHotspotId}        
                      activeVideoId={activeVideoId}        
                      editMode        
                      onSelectHotspot={setActiveHotspotId}        
                      onMoveHotspot={(hotspotId, nextPosition) => updateHotspot(hotspotId, nextPosition)}        
                      onSelectVideo={setActiveVideoId}        
                      onMoveVideo={(videoId, nextPosition) => updateVideoSpot(videoId, nextPosition)}
                      activeAnimatedSpotId={activeAnimatedSpotId}
                      onSelectAnimatedSpot={setActiveAnimatedSpotId}
                      onMoveAnimatedSpot={(spotId, nextPosition) => updateAnimatedSpot(spotId, nextPosition)}
                      initialYaw={activeScene.initialYaw ?? -24}        
                      initialPitch={activeScene.initialPitch ?? 1}        
                      imageRoll={activeScene.imageRoll ?? 0}        
                      onViewChange={handleViewChange}        
                    />        
                  </div>
                    <div className="viewer-overlay">
                      <div>        
                        <span>场景说明</span>
                        <p>{activeScene.description}</p>        
                        <p className="view-angle">        
                          {'第一视角：'}{Math.round(activeScene.initialYaw ?? -24)}{'° / 当前：'}{Math.round(currentView.yaw)}{'°'}
                        </p>        
                
                        <div className="view-angle-controls">        
                          <label>        
                            <span>Yaw</span>        
                            <input        
                              type="range"        
                              min="-180"        
                              max="180"        
                              value={Math.round(activeScene.initialYaw ?? -24)}        
                              onChange={(event) => updateFirstView({ yaw: Number(event.target.value) })}        
                            />        
                            <input        
                              type="number"        
                              min="-180"        
                              max="180"        
                              value={Math.round(activeScene.initialYaw ?? -24)}        
                              onChange={(event) => updateFirstView({ yaw: Number(event.target.value) })}        
                            />        
                          </label>        
                          <label>        
                            <span>Pitch</span>        
                            <input        
                              type="range"        
                              min="-78"        
                              max="78"        
                              value={Math.round(activeScene.initialPitch ?? 1)}        
                              onChange={(event) => updateFirstView({ pitch: Number(event.target.value) })}        
                            />        
                            <input        
                              type="number"        
                              min="-78"        
                              max="78"        
                              value={Math.round(activeScene.initialPitch ?? 1)}        
                              onChange={(event) => updateFirstView({ pitch: Number(event.target.value) })}        
                            />        
                          </label>        
                          <label>        
                            <span>Roll</span>        
                            <input        
                              type="range"        
                              min="-180"        
                              max="180"        
                              value={Math.round(activeScene.imageRoll ?? 0)}        
                              onChange={(event) => updateImageRoll(Number(event.target.value))}        
                            />        
                            <input        
                              type="number"        
                              min="-180"        
                              max="180"        
                              value={Math.round(activeScene.imageRoll ?? 0)}        
                              onChange={(event) => updateImageRoll(Number(event.target.value))}        
                            />        
                          </label>        
                        </div>        
                      </div>        
                      <button type="button" onClick={saveFirstView}>        
                        <Eye size={15} />        
                        {'设为第一视角'}
                      </button>        
                      <button type="button" onClick={addHotspot}>        
                        <Plus size={15} />        
                        添加跳转热点
                      </button>        
                      <button type="button" onClick={addVideoSpot}>        
                        <Video size={15} />        
                        添加视频点位
                      </button>        
                    </div>        
                  </div>        
                
                  <div        
                    className="layout-resizer inspector-resizer"        
                    role="separator"        
                    aria-label="调整右侧宽度"
                    onPointerDown={(event) => startResize('inspector', event)}        
                  />        
                  <aside className="inspector" style={{ width: inspectorWidth }}>
                    <section className="panel">        
                      <div className="panel-heading">        
                        <span>简约平面图</span>
                        <MapPinned size={18} />        
                      </div>        
                      <MapPanel        
                        activeFloor={activeFloor}        
                        floorMap={floorMaps[activeFloor.id]}        
                        scenes={scenes}        
                        activeScene={activeScene}        
                        onSelectScene={selectScene}        
                        onUpdatePosition={updateSceneMapPosition}        
                        onUploadMap={handleFloorMapUpload}        
                      />        
                    </section>

                    <section className="panel">        
                      <div className="panel-heading">        
                        <span>热点跳转</span>
                        <button className="icon-button" type="button" onClick={addHotspot} aria-label="新增热点">
                          <Plus size={17} />        
                        </button>        
                      </div>        
                      <div className="hotspot-list">        
                        {activeScene.hotspots.length === 0 ? <div className="empty-floor">暂无热点，点击右上角添加</div> : null}
                        {activeScene.hotspots.map((hotspot) => (        
                          <button        
                            type="button"        
                            className={`hotspot-row ${hotspot.id === activeHotspotId ? 'is-selected' : ''}`}        
                            key={hotspot.id}        
                            onClick={() => setActiveHotspotId(hotspot.id)}        
                          >        
                            <span>{hotspot.label}</span>        
                            <small>{scenes.find((scene) => scene.id === hotspot.targetSceneId)?.name || '未选择目标'}</small>
                          </button>        
                        ))}        
                      </div>        
                      {activeHotspot ? (        
                        <HotspotEditor        
                          hotspot={activeHotspot}        
                          scenes={scenes.filter((scene) => scene.id !== activeScene.id)}        
                          onChange={(patch) => updateHotspot(activeHotspot.id, patch)}        
                          onDelete={deleteHotspot}        
                        />        
                      ) : null}        
                    </section>        
                
                    <section className="panel">        
                      <div className="panel-heading">        
                        <span>视频点位</span>
                        <button className="icon-button" type="button" onClick={addVideoSpot} aria-label="新增视频点位">
                          <Plus size={17} />        
                        </button>        
                      </div>        
                      <div className="hotspot-list">        
                        {(activeScene.videoSpots || []).length === 0 ? <div className="empty-floor">暂无视频点位，点击右上角添加</div> : null}
                        {(activeScene.videoSpots || []).map((video) => (        
                          <button        
                            type="button"        
                            className={`hotspot-row ${video.id === activeVideoId ? 'is-selected' : ''}`}        
                            key={video.id}        
                            onClick={() => setActiveVideoId(video.id)}        
                          >        
                            <span>{video.label}</span>        
                            <small>{video.url ? '已配置链接' : '未配置链接'}</small>
                          </button>        
                        ))}        
                      </div>        
                      {activeVideoSpot ? (        
                        <VideoSpotEditor        
                          video={activeVideoSpot}        
                          onChange={(patch) => updateVideoSpot(activeVideoSpot.id, patch)}        
                          onDelete={deleteVideoSpot}        
                        />        
                      ) : null}        
                    </section>        

                  </aside>
      </section>
      </section>
    </main>
  );
}

function QuickLinkPanel({ quickLinks, scenes, onAdd, onUpdate, onDelete }) {
  const [selectedId, setSelectedId] = useState(quickLinks[0]?.id || '');
  const selectedLink = quickLinks.find((link) => link.id === selectedId) || quickLinks[0];
  const selectedIndex = selectedLink ? quickLinks.findIndex((link) => link.id === selectedLink.id) : -1;

  useEffect(() => {
    if (quickLinks.length === 0) {
      setSelectedId('');
      return;
    }
    if (!quickLinks.some((link) => link.id === selectedId)) {
      setSelectedId(quickLinks[0].id);
    }
  }, [quickLinks, selectedId]);

  const handleAdd = () => {
    const id = onAdd();
    if (id) setSelectedId(id);
  };

  const handleDelete = () => {
    if (!selectedLink) return;
    const nextLink = quickLinks[selectedIndex + 1] || quickLinks[selectedIndex - 1];
    onDelete(selectedLink.id);
    setSelectedId(nextLink?.id || '');
  };

  return (
    <section className="panel quick-links-panel">
      <div className="panel-heading">
        <span>左侧按钮</span>
        <button className="icon-button" type="button" onClick={handleAdd} aria-label="新增左侧按钮">
          <Plus size={17} />
        </button>
      </div>
      {quickLinks.length === 0 ? (
        <div className="quick-link-empty">
          <span>暂无按钮</span>
          <button type="button" onClick={handleAdd}>添加按钮1</button>
        </div>
      ) : (
        <>
          <div className="quick-link-tabs" role="tablist" aria-label="左侧按钮切换">
            {quickLinks.map((link, index) => (
              <button
                key={link.id}
                type="button"
                role="tab"
                aria-selected={link.id === selectedLink?.id}
                className={link.id === selectedLink?.id ? 'is-active' : ''}
                onClick={() => setSelectedId(link.id)}
              >
                按钮{index + 1}
              </button>
            ))}
          </div>
          {selectedLink ? (
            <div className="quick-link-editor">
              <div className="quick-link-editor-title">
                <strong>按钮{selectedIndex + 1}</strong>
                <span>{selectedLink.label || '未命名'}</span>
              </div>
              <label>
                按钮名称
                <input value={selectedLink.label || ''} onChange={(event) => onUpdate(selectedLink.id, { label: event.target.value })} />
              </label>
              <label>
                对应场景
                <select
                  value={selectedLink.targetSceneId || ''}
                  onChange={(event) => {
                    const scene = scenes.find((item) => item.id === event.target.value);
                    onUpdate(selectedLink.id, {
                      targetSceneId: event.target.value,
                      label: selectedLink.label || scene?.name || '弹窗按钮',
                    });
                  }}
                >
                  <option value="">请选择场景</option>
                  {scenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>{scene.name}</option>
                  ))}
                </select>
              </label>
              <label>
                打开方式
                <select
                  value={selectedLink.action === 'navigate' ? 'navigate' : 'modal'}
                  onChange={(event) => onUpdate(selectedLink.id, { action: event.target.value })}
                >
                  <option value="modal">打开弹窗</option>
                  <option value="navigate">直接进入场景</option>
                </select>
              </label>
              <button className="danger-button" type="button" onClick={handleDelete}>
                删除按钮{selectedIndex + 1}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function AnimatedSpotPanel({ spots, activeSpot, onAdd, onSelect, onUpdate, onUpload, onDelete }) {
  const fileInputRef = useRef(null);
  return (
    <section className="panel animated-spots-panel">
      <div className="panel-heading">
        <span>GIF动态贴图</span>
        <button className="icon-button" type="button" onClick={onAdd} aria-label="新增动态贴图">
          <Plus size={17} />
        </button>
      </div>
      {spots.length === 0 ? <div className="quick-link-empty"><span>暂无动态贴图</span><button type="button" onClick={onAdd}>添加动态贴图</button></div> : null}
      {spots.length > 0 ? (
        <div className="animated-spot-list">
          {spots.map((spot, index) => (
            <button
              type="button"
              key={spot.id}
              className={spot.id === activeSpot?.id ? 'is-active' : ''}
              onClick={() => onSelect(spot.id)}
            >
              <span className="animated-spot-thumb" style={{ backgroundImage: spot.imageUrl ? `url(${spot.imageUrl})` : 'none' }} />
              <span><strong>{spot.name || `动态贴图${index + 1}`}</strong><small>{spot.imageUrl ? '已上传' : '待上传'}</small></span>
            </button>
          ))}
        </div>
      ) : null}
      {activeSpot ? (
        <div className="hotspot-editor animated-spot-editor">
          <label>
            贴图名称
            <input value={activeSpot.name || ''} onChange={(event) => onUpdate(activeSpot.id, { name: event.target.value })} />
          </label>
          <button className="secondary-button animated-upload-button" type="button" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus size={16} />
            上传 GIF / 动态 WebP
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/gif,image/webp,.gif,.webp"
            hidden
            onChange={(event) => {
              onUpload(activeSpot.id, event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <label>
            左右位置 {Math.round(activeSpot.yaw || 0)}
            <input type="range" min="-180" max="180" value={activeSpot.yaw || 0} onChange={(event) => onUpdate(activeSpot.id, { yaw: Number(event.target.value) })} />
          </label>
          <label>
            上下位置 {Math.round(activeSpot.pitch || 0)}
            <input type="range" min="-75" max="75" value={activeSpot.pitch || 0} onChange={(event) => onUpdate(activeSpot.id, { pitch: Number(event.target.value) })} />
          </label>
          <label>
            贴图大小 {Math.round(activeSpot.size || 100)}%
            <input type="range" min="10" max="300" value={activeSpot.size || 100} onChange={(event) => onUpdate(activeSpot.id, { size: Number(event.target.value) })} />
          </label>
          <label>
            旋转角度 {Math.round(activeSpot.rotation || 0)}°
            <input type="range" min="-180" max="180" value={activeSpot.rotation || 0} onChange={(event) => onUpdate(activeSpot.id, { rotation: Number(event.target.value) })} />
          </label>
          <label>
            播放次数
            <select value={activeSpot.playCount || 0} onChange={(event) => onUpdate(activeSpot.id, { playCount: Number(event.target.value) })}>
              <option value="0">无限循环</option>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>播放 {count} 次</option>)}
            </select>
          </label>
          <button className="danger-button" type="button" onClick={onDelete}>删除动态贴图</button>
        </div>
      ) : null}
    </section>
  );
}

function SceneEditor({ scene, onChange }) {
  const tiles = createManualTiles(scene);
  const isManualTiles = true;
  const updateTiles = (patch) => {
    onChange({
      imageMode: 'manualTiles',
      krpanoTiles: createManualTiles(scene, patch),
    });
  };

  return (
    <div className="scene-editor">
      <label>
        场景名称
        <input value={scene.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label>
        场景介绍
        <textarea value={scene.description} onChange={(event) => onChange({ description: event.target.value })} />
      </label>
      <div className="manual-tile-box">
        <div className="manual-tile-title">
          <strong>全景图加载方式</strong>
          <span>{isManualTiles ? '已启用六面图加载' : '单张全景图模式'}</span>
        </div>
        <label className="manual-mode-field">
          图片加载模式
          <select
            value={isManualTiles ? 'manualTiles' : 'single'}
            onChange={(event) => {
              if (event.target.value === 'single') {
                onChange({ imageMode: 'single', krpanoTiles: null });
                return;
              }
              updateTiles({});
            }}
          >
            <option value="single">单张全景图</option>
            <option value="manualTiles">按文件路径加载六面图</option>
          </select>
        </label>
        {(
          <>
            <label>
              图片路径规则
              <input
                value={tiles.pattern}
                placeholder="/tour-output/assets/manual-tiles/scene-name/{face}/{row}_{col}.webp"
                onChange={(event) => updateTiles({ pattern: event.target.value })}
              />
            </label>
            <div className="manual-tile-grid">
              <label>
                每面切片数量
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={tiles.grid}
                  onChange={(event) => updateTiles({ grid: Number(event.target.value) })}
                />
              </label>
              <label>
                层级
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={tiles.level}
                  onChange={(event) => updateTiles({ level: Number(event.target.value) })}
                />
              </label>
              <label>
                切片尺寸
                <input
                  type="number"
                  min="256"
                  max="4096"
                  step="128"
                  value={tiles.tileSize}
                  onChange={(event) => updateTiles({ tileSize: Number(event.target.value) })}
                />
              </label>
            </div>
            <p className="edit-tip">
              图片放在 assets/manual-tiles 目录下。六个面分别是 f、r、b、l、u、d。数量 1 表示加载 6 张图，数量 2 表示加载 24 张图。
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function VideoSpotEditor({ video, onChange, onDelete }) {
  return (
    <div className="hotspot-editor">
      <label>
        视频名称
        <input value={video.label} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <label>
        视频链接
        <input
          value={video.url || ''}
          placeholder="支持 mp4/webm/ogg 或可嵌入视频页面链接"
          onChange={(event) => onChange({ url: event.target.value })}
        />
      </label>
      <div className="video-style-field">
        <span>按钮样式</span>
        <div className="video-style-switch" role="group" aria-label="视频按钮样式">
          <button
            className={video.displayStyle === 'small' ? 'is-active' : ''}
            type="button"
            aria-pressed={video.displayStyle === 'small'}
            onClick={() => onChange({ displayStyle: 'small' })}
          >
            小按钮
          </button>
          <button
            className={video.displayStyle !== 'small' ? 'is-active' : ''}
            type="button"
            aria-pressed={video.displayStyle !== 'small'}
            onClick={() => onChange({ displayStyle: 'large' })}
          >
            大按钮
          </button>
        </div>
      </div>
      <label>
        左右位置 {Math.round(video.yaw)}
        <input type="range" min="-180" max="180" value={video.yaw} onChange={(event) => onChange({ yaw: Number(event.target.value) })} />
      </label>
      <label>
        上下位置 {Math.round(video.pitch || 0)}
        <input type="range" min="-65" max="65" value={video.pitch || 0} onChange={(event) => onChange({ pitch: Number(event.target.value) })} />
      </label>
      <label>
        提示框大小 {Math.round(video.size || 100)}%
        <input type="range" min="10" max="180" value={video.size || 100} onChange={(event) => onChange({ size: Number(event.target.value) })} />
      </label>
      <button className="danger-button" type="button" onClick={onDelete}>删除视频点位</button>
    </div>
  );
}

function MapPanel({ activeFloor, floorMap, scenes, activeScene, onSelectScene, onUpdatePosition, onUploadMap }) {
  const mapRef = useRef(null);
  const mapInputRef = useRef(null);
  const floorScenes = scenes.filter((scene) => scene.floorId === activeScene.floorId);

  const updateFromPointer = (event) => {
    const rect = mapRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    onUpdatePosition({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };

  return (
    <div className="map-editor">
      <div className="map-toolbar">
        <button className="secondary-button map-upload-button" type="button" onClick={() => mapInputRef.current?.click()}>
          <FileImage size={15} />
          {'\u4e0a\u4f20\u5e73\u9762\u56fe'}
        </button>
        <span>{floorMap?.name || '\u672a\u4e0a\u4f20\u5e73\u9762\u56fe\uff0c\u4f7f\u7528\u9ed8\u8ba4\u7b80\u56fe'}</span>
        <input
          ref={mapInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            onUploadMap(activeFloor.id, event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
      <div className="map-canvas" ref={mapRef} onDoubleClick={updateFromPointer}>
        {floorMap?.imageUrl ? (
          <img className="uploaded-map" src={floorMap.imageUrl} alt={`${activeFloor.name}\u5e73\u9762\u56fe`} />
        ) : activeFloor.mapType === 'campus' ? (
          <CampusDistributionMap scenes={scenes} activeSceneId={activeScene.id} onSelectScene={onSelectScene} />
        ) : (
          <SimpleFloorMap floor={activeFloor} />
        )}
        {floorScenes.map((scene) => {
          const position = activeFloor.mapType === 'campus' ? scene.campusPosition : scene.mapPosition;
          return (
            <button
              type="button"
              key={scene.id}
              className={`floor-marker ${scene.id === activeScene.id ? 'is-active' : ''}`}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => onSelectScene(scene.id)}
              title={scene.name}
            >
              {scene.id === activeScene.id ? '\u25cf' : '\u2022'}
            </button>
          );
        })}
        <div className="map-hint"><Move size={14} /> {'\u53cc\u51fb\u5e73\u9762\u56fe\u53ef\u79fb\u52a8\u5f53\u524d\u70b9\u4f4d'}</div>
      </div>
    </div>
  );
}

function CampusDistributionMap() {
  return (
    <svg className="simple-map" viewBox="0 0 1000 560" role="img" aria-label="泰安基地简约总平面图">
      <rect width="1000" height="560" rx="26" fill="#eef6ff" />
      <path d="M88 94 H914 V472 H146 L90 112 Z" fill="#ffffff" stroke="#c9dcf4" strokeWidth="4" />
      <path d="M155 138 V420 H880 V170" fill="none" stroke="#9fc3ec" strokeWidth="24" strokeLinecap="round" />
      <path d="M362 214 H650 M404 304 H874 M410 390 H884" fill="none" stroke="#9fc3ec" strokeWidth="16" strokeLinecap="round" />
      <path d="M520 138 V314 M388 304 H520 V414" fill="none" stroke="#9fc3ec" strokeWidth="16" strokeLinecap="round" />
      <circle cx="520" cy="280" r="62" fill="#d8eaff" stroke="#7db0ea" strokeWidth="14" />
      <circle cx="520" cy="280" r="35" fill="#2f7fdf" />
      <BuildingShape x={280} y={92} w={178} h={88} label="教学楼" />
      <BuildingShape x={282} y={252} w={112} h={134} label="教学楼" />
      <BuildingShape x={444} y={342} w={168} h={78} label="二号楼" />
      <BuildingShape x={674} y={342} w={218} h={78} label="三号楼" />
      <BuildingShape x={620} y={92} w={252} h={84} label="餐厅" />
      <BuildingShape x={808} y={176} w={72} h={132} label="四号楼" />
      <BuildingShape x={914} y={220} w={44} h={216} label="洗衣房" />
      <text x="160" y="286" className="map-text-dark">大门</text>
    </svg>
  );
}

function SimpleFloorMap({ floor }) {
  const isFirst = floor.variant?.includes('1f') || floor.variant === 'b1-1' || floor.variant === 'b4-1';
  const isB4 = floor.variant?.startsWith('b4');
  const isB1 = floor.variant?.startsWith('b1');

  return (
    <svg className="simple-map" viewBox="0 0 1000 560" role="img" aria-label={`${floor.name}简约平面图`}>
      <rect width="1000" height="560" rx="26" fill="#eef6ff" />
      <rect x="62" y="82" width="876" height="380" rx="18" fill="#fff" stroke="#c9dcf4" strokeWidth="4" />
      {isB4 ? <rect x="630" y="240" width="240" height="220" rx="16" fill="#f9fcff" stroke="#c9dcf4" strokeWidth="4" /> : null}
      {isB1 ? <rect x="86" y="118" width="180" height="270" rx="16" fill="#f9fcff" stroke="#c9dcf4" strokeWidth="4" /> : null}
      <rect x={isB1 ? 310 : 110} y="250" width={isB1 ? 560 : 780} height="56" rx="14" fill="#d8eaff" />
      {isFirst ? <rect x="456" y="138" width="126" height="92" rx="14" fill="#eaf4ff" stroke="#9fc3ec" strokeWidth="3" /> : null}
      {Array.from({ length: isB4 ? 12 : 16 }).map((_, index) => {
        const x = (isB1 ? 314 : 116) + index * (isB4 ? 58 : 48);
        if (x > 865) return null;
        return <Room key={`top-${index}`} x={x} y={116} label={`${floor.name.replace('层', '')}${String(index + 1).padStart(2, '0')}`} />;
      })}
      {Array.from({ length: isB4 ? 10 : 15 }).map((_, index) => {
        const x = (isB1 ? 314 : 116) + index * (isB4 ? 58 : 50);
        if (x > 865) return null;
        return <Room key={`bottom-${index}`} x={x} y={324} label={`${floor.name.replace('层', '')}${String(index + 17).padStart(2, '0')}`} />;
      })}
      <path d="M116 278 H884" stroke="#2f7fdf" strokeWidth="4" strokeDasharray="10 10" />
      <path d="M210 278 l-16 -9 v18 z M430 278 l16 -9 v18 z M650 278 l-16 -9 v18 z M850 278 l16 -9 v18 z" fill="#2f7fdf" />
      <text x="86" y="512" className="map-legend">简约疏散方向</text>
      <circle cx="252" cy="504" r="8" fill="#2f7fdf" />
      <text x="270" y="512" className="map-legend">当前点位可在图上双击调整</text>
    </svg>
  );
}

function Room({ x, y, label }) {
  return (
    <g>
      <rect x={x} y={y} width="42" height="96" rx="8" fill="#f9fcff" stroke="#c9dcf4" strokeWidth="2" />
      <text x={x + 21} y={y + 55} textAnchor="middle" className="room-label">{label}</text>
    </g>
  );
}

function BuildingShape({ x, y, w, h, label }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="#d8eaff" stroke="#7db0ea" strokeWidth="4" />
      <text x={x + w / 2} y={y + h / 2 + 6} textAnchor="middle" className="building-label">{label}</text>
    </g>
  );
}

function HotspotEditor({ hotspot, scenes, onChange, onDelete }) {
  const selectedScene = scenes.find((scene) => scene.id === hotspot.targetSceneId);

  return (
    <div className="hotspot-editor">
      <label>
        热点名称
        <input value={hotspot.label} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <label>
        进入场景
        <select
          value={hotspot.targetSceneId || ''}
          onChange={(event) => {
            const scene = scenes.find((item) => item.id === event.target.value);
            onChange({ targetSceneId: event.target.value, label: scene ? `前往${scene.name}` : hotspot.label });
          }}
        >
          <option value="">请选择目标场景</option>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>{scene.name}</option>
          ))}
        </select>
      </label>
      <label>
        左右位置 {Math.round(hotspot.yaw)}
        <input type="range" min="-180" max="180" value={hotspot.yaw} onChange={(event) => onChange({ yaw: Number(event.target.value) })} />
      </label>

      <label>
        Pitch {Math.round(hotspot.pitch || 0)}
        <input type="range" min="-65" max="65" value={hotspot.pitch || 0} onChange={(event) => onChange({ pitch: Number(event.target.value) })} />
      </label>
      <label>
        Size {Math.round(hotspot.size || 100)}%
        <input type="range" min="70" max="180" value={hotspot.size || 100} onChange={(event) => onChange({ size: Number(event.target.value) })} />
      </label>
      <button className="danger-button" type="button" onClick={onDelete}>删除热点</button>
    </div>
  );
}

function createStandaloneHtml(project) {
  const payload = JSON.stringify(project).replace(/</g, '\\u003c');
  const previewHtml = createTourHtml('__PROJECT_PAYLOAD__');
  return previewHtml.replace('__PROJECT_PAYLOAD__', payload);
}

function extensionFromDataUrl(dataUrl, fallback = 'jpg') {
  const mime = /^data:([^;,]+)/i.exec(dataUrl || '')?.[1]?.toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  return fallback;
}

function safeFilePart(value, fallback) {
  return String(value || fallback)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || fallback;
}

function safeAssetFileName(value, fallbackBase, fallbackExt) {
  const rawName = String(value || '').split(/[\\/]/).pop() || '';
  const ext = rawName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || fallbackExt;
  const base = safeFilePart(rawName, fallbackBase);
  return `${base}.${ext}`;
}

function createStandalonePackage(project) {
  const assets = [];
  const projectForFiles = structuredClone(project);

  projectForFiles.scenes = (projectForFiles.scenes || []).map((scene) => {
    const imageUrl = pathOnlyAssetUrl(scene.imageUrl, 'panoramas', scene.assetFileName, demoPanorama);
    const thumbnailUrl = pathOnlyAssetUrl(scene.thumbnailUrl, 'thumbs', scene.thumbnailFileName, imageUrl);
    return {
      ...scene,
      imageUrl: toPackageAssetUrl(imageUrl),
      imageDataUrl: null,
      thumbnailUrl: toPackageAssetUrl(thumbnailUrl),
      planetUrl: toPackageAssetUrl(pathOnlyAssetUrl(scene.planetUrl, 'planets', scene.planetFileName, '')),
      planetPreviewUrl: toPackageAssetUrl(pathOnlyAssetUrl(scene.planetPreviewUrl, 'planets', scene.planetPreviewFileName, '')),
      krpanoTiles: mapManualTileUrls(inferManualTiles(scene), toPackageAssetUrl),
      animatedSpots: (scene.animatedSpots || []).map((spot) => ({
        ...spot,
        imageUrl: toPackageAssetUrl(pathOnlyAssetUrl(spot.imageUrl, 'animations', spot.assetFileName, '')),
      })),
    };
  });

  projectForFiles.floorMaps = Object.fromEntries(
    Object.entries(projectForFiles.floorMaps || {}).map(([floorId, map]) => {
      const imageUrl = pathOnlyAssetUrl(map?.imageUrl, 'maps', map?.assetFileName, '');
      return [
        floorId,
        {
          ...map,
          imageUrl: toPackageAssetUrl(imageUrl),
          imageDataUrl: null,
        },
      ];
    }),
  );

  const openingScene = projectForFiles.scenes.find((scene) => scene.id === 'outdoor-gate') || projectForFiles.scenes[0];
  projectForFiles.activeSceneId = openingScene?.id || projectForFiles.activeSceneId;

  const inlineHtml = createStandaloneHtml(projectForFiles);
  const css = inlineHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1]?.trim() || '';
  const js = inlineHtml.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1]?.trim() || '';
  const html = inlineHtml
    .replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="./assets/tour.css" />')
    .replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module" src="./assets/tour.js"></script>');
  const previewHtml = html.replace('<head>\n', '<head>\n<base href="/tour-output/" />\n');

  return {
    html,
    previewHtml,
    css,
    js,
    projectJson: JSON.stringify(projectForFiles, null, 2),
    assets,
  };
}

function createTourHtml(projectExpression) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>学校360全景浏览</title>
<style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden;font-family:"Microsoft YaHei",system-ui,sans-serif;background:linear-gradient(180deg,#65d7ff 0%,#b9edff 48%,#edf9ff 100%);color:#fff}.tour-stage{position:fixed;inset:0;background:linear-gradient(180deg,#65d7ff 0%,#b9edff 48%,#edf9ff 100%);cursor:grab}.tour-stage:active{cursor:grabbing}.markers{position:fixed;inset:0;pointer-events:none}.tour-marker{position:absolute;z-index:5;pointer-events:auto;transform:translate3d(-999px,-999px,0);padding:9px 13px 9px 30px;border:1px solid rgba(255,255,255,.72);border-radius:999px;background:rgba(255,255,255,.82);color:#0b3f8a;font-size:12px;font-weight:900;box-shadow:0 16px 42px rgba(0,0,0,.35);backdrop-filter:blur(14px);cursor:pointer;white-space:nowrap}.tour-marker:before{content:"";position:absolute;left:11px;top:50%;width:9px;height:9px;border-radius:99px;background:#2f7fdf;transform:translateY(-50%);box-shadow:0 0 0 5px rgba(47,127,223,.2)}.tour-marker.video{background:rgba(216,234,255,.86)}.tour-marker.video:before{width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid #2f7fdf;border-radius:0;background:transparent;box-shadow:none}.bottom-dock{position:fixed;left:50%;bottom:18px;z-index:10;display:grid;grid-template-columns:minmax(240px,320px) minmax(0,760px);gap:12px;width:min(1120px,calc(100vw - 36px));padding:12px;border:1px solid rgba(255,255,255,.22);border-radius:16px;background:rgba(7,32,69,.38);box-shadow:0 24px 80px rgba(0,0,0,.38);backdrop-filter:blur(22px);transform:translateX(-50%) translateY(48px);transition:transform .24s ease,background .24s ease}.bottom-dock:hover{transform:translateX(-50%) translateY(0);background:rgba(7,32,69,.58)}.scene-info{min-width:0;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.12)}.scene-info h1{margin:0 0 7px;font-size:20px;line-height:1.2}.scene-info p{display:-webkit-box;margin:0;overflow:hidden;color:rgba(255,255,255,.8);font-size:13px;line-height:1.55;-webkit-line-clamp:3;-webkit-box-orient:vertical}.scene-rail{display:flex;gap:10px;align-items:stretch;overflow-x:auto;overscroll-behavior:contain;padding:2px 2px 6px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.45) transparent}.scene-card{display:grid;grid-template-columns:64px 148px;gap:10px;min-width:230px;padding:9px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.12);color:#fff;text-align:left;cursor:pointer}.scene-card.active{border-color:rgba(125,176,234,.92);background:rgba(47,127,223,.34)}.scene-card span{display:block;width:64px;height:48px;border-radius:9px;background-position:center;background-size:cover}.scene-card strong{display:block;overflow:hidden;font-size:13px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.scene-card small{display:block;margin-top:6px;color:rgba(255,255,255,.68);font-size:12px}.floating-map{position:fixed;right:18px;bottom:132px;z-index:9;width:min(132px,18vw);padding:6px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(255,255,255,.18);box-shadow:0 12px 38px rgba(0,0,0,.24);backdrop-filter:blur(22px);pointer-events:none}.floating-map h2{display:none}.map-card{position:relative}.simple-map{display:block;width:100%;height:76px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:#eef6ff}.map-dot{position:absolute;width:10px;height:10px;border:1px solid #fff;border-radius:99px;background:#7db0ea;box-shadow:0 5px 12px rgba(0,0,0,.2);transform:translate(-50%,-50%);pointer-events:none}.map-dot.is-active{width:14px;height:14px;background:#2f7fdf}.quick-entry{position:fixed;left:18px;top:148px;z-index:13;display:grid;gap:8px}.quick-entry button{min-width:86px;min-height:34px;padding:0 12px;border:1px solid rgba(255,255,255,.34);border-radius:999px;background:rgba(7,32,69,.52);color:#fff;font-size:13px;font-weight:900;box-shadow:0 12px 30px rgba(0,0,0,.25);backdrop-filter:blur(16px);cursor:pointer}.quick-modal{position:fixed;inset:0;z-index:34;display:none;align-items:center;justify-content:center;padding:42px;background:rgba(3,12,28,.58);backdrop-filter:blur(18px)}.quick-modal.open{display:flex}.quick-panel{position:relative;width:min(1180px,92vw);aspect-ratio:16/9;border:1px solid rgba(255,255,255,.26);border-radius:18px;overflow:hidden;background:#071c3b;box-shadow:0 28px 90px rgba(0,0,0,.42)}.quick-stage{position:absolute;inset:0;cursor:grab}.quick-modal h2{position:absolute;left:18px;top:16px;z-index:2;margin:0;padding:8px 12px;border-radius:999px;background:rgba(0,0,0,.42);font-size:14px}.quick-close{position:absolute;right:18px;top:16px;z-index:3;min-height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.36);border-radius:999px;background:rgba(255,255,255,.82);color:#0b3f8a;font-weight:900}.video-modal{position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;padding:26px;background:rgba(6,20,45,.48);backdrop-filter:blur(18px)}.video-modal.open{display:flex}.video-modal button{position:absolute;right:24px;top:24px;min-height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.36);border-radius:8px;background:rgba(255,255,255,.78);color:#0b3f8a;font-weight:900;backdrop-filter:blur(14px)}.video-frame{width:min(1120px,94vw);height:min(680px,72vh);border:1px solid rgba(255,255,255,.34);border-radius:14px;background:rgba(255,255,255,.12);box-shadow:0 28px 90px rgba(0,0,0,.42);backdrop-filter:blur(18px)}@media(max-width:860px){.bottom-dock{grid-template-columns:1fr;transform:translateX(-50%) translateY(70px)}.floating-map{right:12px;bottom:202px;width:120px}.quick-entry{left:12px;top:120px}.quick-modal{padding:18px}.scene-info h1{font-size:17px}}
 .tour-title{position:fixed;left:22px;top:22px;z-index:12;max-width:min(460px,calc(100vw - 44px));padding:12px 15px;border-radius:8px;background:rgba(0,0,0,.48);backdrop-filter:blur(12px)}.tour-title h1{margin:0 0 5px;font-size:21px;line-height:1.22}.tour-title p{margin:0;color:rgba(255,255,255,.82);font-size:13px;line-height:1.55}.bottom-dock{grid-template-columns:1fr;bottom:0;width:min(920px,calc(100vw - 36px));transform:translateX(-50%) translateY(calc(100% - 14px));padding:12px}.bottom-dock:hover,.bottom-dock.is-open{transform:translateX(-50%) translateY(0)}.scene-info{display:none}.scene-rail{min-height:92px}.floor-bucket{position:relative;min-width:158px}.floor-card{width:100%;min-height:74px;padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.12);color:#fff;text-align:left;cursor:pointer}.floor-card strong{display:block;font-size:14px}.floor-card small{display:block;margin-top:8px;color:rgba(255,255,255,.68);font-size:12px}.scene-sublist{position:absolute;left:0;bottom:86px;display:none;width:260px;max-height:300px;overflow:auto;padding:8px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(7,32,69,.72);box-shadow:0 18px 60px rgba(0,0,0,.34);backdrop-filter:blur(20px)}.floor-bucket.open .scene-sublist{display:grid;gap:8px}.scene-card{grid-template-columns:54px minmax(0,1fr);min-width:0;width:100%;background:rgba(255,255,255,.1)}.scene-card span{width:54px;height:40px}.tour-marker.video{width:108px;height:68px;padding:0;border-radius:12px;background:linear-gradient(135deg,rgba(114,92,226,.82),rgba(59,176,235,.76));color:transparent;box-shadow:0 18px 42px rgba(31,81,180,.35)}.tour-marker.video:before{left:50%;top:50%;width:0;height:0;border-top:14px solid transparent;border-bottom:14px solid transparent;border-left:22px solid rgba(255,255,255,.88);transform:translate(-38%,-50%);filter:drop-shadow(0 3px 8px rgba(0,0,0,.2))}
 .scene-rail{overflow-x:auto;overflow-y:hidden}.scene-sublist{display:none!important}.scene-picker{position:fixed;left:50%;bottom:112px;z-index:18;display:none;width:min(340px,calc(100vw - 36px));max-height:min(360px,52vh);overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.22);border-radius:16px;background:rgba(7,32,69,.72);box-shadow:0 22px 70px rgba(0,0,0,.38);backdrop-filter:blur(24px)}.scene-picker.open{display:grid;gap:8px}.map-dot{appearance:none;display:grid;place-items:center;width:10px;height:10px;padding:0;border:1px solid rgba(255,255,255,.92);border-radius:99px;background:#7db0ea;color:#fff;font-size:0;font-weight:900;pointer-events:none}.map-dot.is-active{width:14px;height:14px;background:#2f7fdf;box-shadow:0 0 0 3px rgba(47,127,223,.18),0 7px 16px rgba(0,0,0,.22);font-size:7px}.tour-marker.video{width:178px;height:112px;padding:0;border-radius:18px;border:1px solid rgba(255,255,255,.48);background:linear-gradient(135deg,rgba(255,255,255,.28),rgba(120,175,238,.18));color:transparent;box-shadow:0 22px 54px rgba(4,18,44,.38),inset 0 1px 0 rgba(255,255,255,.38);backdrop-filter:blur(20px) saturate(1.25);overflow:hidden}.tour-marker.video:after{content:"";position:absolute;inset:10px;border-radius:14px;border:1px solid rgba(255,255,255,.22);background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(47,127,223,.12))}.tour-marker.video:before{z-index:2;left:50%;top:50%;width:0;height:0;border-top:18px solid transparent;border-bottom:18px solid transparent;border-left:28px solid rgba(255,255,255,.9);transform:translate(-35%,-50%);filter:drop-shadow(0 5px 12px rgba(0,0,0,.28))}.video-empty{display:grid;place-items:center;padding:28px;color:#fff;font-size:18px;font-weight:900;text-align:center;background:rgba(255,255,255,.14)}.planet-intro-canvas{position:fixed;inset:0;z-index:28;width:100%;height:100%;opacity:0;pointer-events:none;transform:scale(1);transform-origin:center center;transition:none;background:linear-gradient(180deg,#38c8fa 0%,#99e6ff 50%,#eefcff 100%);will-change:opacity,transform}.planet-intro-canvas.show{opacity:1!important}.transition-snapshot{position:fixed;inset:0;z-index:24;opacity:0;pointer-events:none;background-position:center;background-size:cover;transform:scale(1);transform-origin:center;filter:blur(0);will-change:opacity,transform,filter}.tour-stage canvas{transition:none;will-change:filter,transform,opacity}.markers,.bottom-dock,.floating-map,.tour-title{transition:opacity .28s ease}.is-cinematic .markers,.is-cinematic .bottom-dock,.is-cinematic .floating-map,.is-cinematic .tour-title{opacity:0;pointer-events:none}.motion-overlay{position:fixed;inset:0;z-index:30;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .18s ease;background:radial-gradient(circle at 50% 44%,rgba(47,127,223,.12),rgba(2,8,23,0) 42%,rgba(2,8,23,.24) 100%)}.motion-overlay.open{opacity:1}.motion-guide{display:grid;gap:14px;place-items:center;transform:translateY(-28px)}.motion-chip{display:grid;gap:9px;width:min(260px,calc(100vw - 48px));padding:11px 16px 12px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:rgba(0,0,0,.5);box-shadow:0 12px 38px rgba(0,0,0,.28);backdrop-filter:blur(16px);color:#fff}.motion-label{text-align:center;font-size:14px;font-weight:900;line-height:1.35}.motion-progress{height:5px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.2);box-shadow:inset 0 1px 2px rgba(0,0,0,.24)}.motion-progress span{display:block;width:100%;height:100%;border-radius:inherit;background:#fff;box-shadow:0 0 12px rgba(125,176,234,.9);transform:scaleX(0);transform-origin:left center;will-change:transform}.motion-arrows{display:grid;gap:5px;place-items:center}.motion-arrows span{display:block;width:34px;height:14px;border-left:4px solid rgba(255,255,255,.92);border-bottom:4px solid rgba(255,255,255,.92);transform:rotate(-45deg);filter:drop-shadow(0 4px 10px rgba(0,0,0,.36));animation:walkArrow .8s infinite ease-in-out}.motion-arrows span:nth-child(2){animation-delay:.1s;opacity:.78}.motion-arrows span:nth-child(3){animation-delay:.2s;opacity:.56}@keyframes walkArrow{0%{transform:translateY(-8px) rotate(-45deg);opacity:.08}45%{opacity:1}100%{transform:translateY(16px) rotate(-45deg);opacity:.08}}
.floating-map{right:22px;bottom:118px;width:min(282px,25vw);padding:8px;border-radius:14px}.simple-map{height:158px}.map-dot{width:14px;height:14px;font-size:0}.map-dot.is-active{width:22px;height:22px;font-size:9px}.map-toggle{display:none;position:fixed;right:12px;top:50%;z-index:11;min-height:44px;padding:0 10px;border:1px solid rgba(255,255,255,.34);border-radius:999px 0 0 999px;background:rgba(7,32,69,.72);color:#fff;font-size:13px;font-weight:900;box-shadow:0 16px 42px rgba(0,0,0,.3);backdrop-filter:blur(18px);cursor:pointer}.map-unavailable .map-toggle{display:none!important}.quick-entry{gap:10px}.quick-entry button{display:grid;grid-template-columns:42px minmax(0,1fr);align-items:center;gap:8px;min-width:122px;min-height:50px;padding:6px 12px 6px 7px;border-radius:14px;text-align:left}.quick-entry-thumb{display:block;width:42px;height:34px;border-radius:9px;background-position:center;background-size:cover;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}.quick-entry-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-picker{width:min(560px,calc(100vw - 36px));grid-template-columns:repeat(2,minmax(0,1fr))}.scene-picker.open{display:grid}.scene-picker .scene-card{display:grid;grid-template-columns:1fr;grid-template-rows:98px auto;gap:8px;min-width:0;width:100%;padding:8px}.scene-picker .scene-card span{width:100%;height:98px}.scene-picker .scene-card strong{text-align:center;white-space:normal}.scene-picker .scene-card small{display:none}@media(max-width:860px){.tour-title{left:12px;top:12px;max-width:calc(100vw - 24px);padding:10px 12px}.tour-title h1{font-size:18px}.tour-title p{font-size:12px}.quick-entry{left:12px;top:112px}.quick-entry button{grid-template-columns:36px minmax(0,1fr);min-width:108px;min-height:44px}.quick-entry-thumb{width:36px;height:30px}.floating-map{display:block!important;right:12px;bottom:86px;width:min(320px,82vw);padding:8px;opacity:0;transform:translateX(calc(100% + 24px));pointer-events:none;transition:opacity .24s ease,transform .24s ease}.map-open .floating-map{opacity:1;transform:translateX(0);pointer-events:auto}.simple-map{height:178px}.map-toggle{display:inline-flex;align-items:center}.scene-picker{bottom:94px;width:calc(100vw - 24px);grid-template-columns:repeat(2,minmax(0,1fr));max-height:46vh}.scene-picker .scene-card{grid-template-rows:82px auto}.scene-picker .scene-card span{height:82px}.bottom-dock{width:calc(100vw - 24px);padding:10px}.floor-bucket{min-width:132px}.floor-card{min-height:64px;padding:10px}.is-cinematic .map-toggle{opacity:0;pointer-events:none}}
.music-control{position:fixed;right:22px;top:22px;z-index:15;display:none;align-items:center;min-height:36px;padding:0 13px;border:1px solid rgba(255,255,255,.34);border-radius:999px;background:rgba(7,32,69,.58);color:#fff;font-size:13px;font-weight:900;box-shadow:0 14px 36px rgba(0,0,0,.26);backdrop-filter:blur(18px);cursor:pointer}.music-control.show{display:inline-flex}@media(max-width:860px){.music-control{right:12px;top:64px;min-height:34px;padding:0 11px;font-size:12px}}
.quick-toggle,.gyro-control{display:none}.tour-stage{touch-action:none;overscroll-behavior:none}@media(max-width:860px){.quick-toggle,.map-toggle{position:fixed;top:50%;z-index:16;min-height:44px;padding:0 10px;border:1px solid rgba(255,255,255,.34);background:rgba(7,32,69,.76);color:#fff;font-size:12px;font-weight:900;box-shadow:0 16px 42px rgba(0,0,0,.3);backdrop-filter:blur(18px);cursor:pointer;transform:translateY(-50%)}.quick-toggle{display:inline-flex;left:0;align-items:center;border-radius:0 999px 999px 0}.map-toggle{right:0;border-radius:999px 0 0 999px}.quick-unavailable .quick-toggle{display:none!important}.quick-entry{left:10px;top:50%;max-height:58vh;overflow:auto;opacity:0;transform:translate(calc(-100% - 24px),-50%);pointer-events:none;transition:opacity .24s ease,transform .24s ease}.quick-open .quick-entry{opacity:1;transform:translate(0,-50%);pointer-events:auto}.quick-entry button{grid-template-columns:34px minmax(0,1fr);min-width:106px;min-height:42px;padding:5px 10px 5px 6px}.quick-entry-thumb{width:34px;height:28px}.floating-map{bottom:86px}.scene-picker{left:6px;bottom:82px;width:calc(100vw - 12px);max-height:54vh;padding:6px;gap:4px;grid-template-columns:repeat(6,minmax(0,1fr));transform:none;border-radius:10px}.scene-picker .scene-card{grid-template-rows:42px auto;gap:4px;padding:4px;border-radius:8px}.scene-picker .scene-card span{height:42px;border-radius:6px}.scene-picker .scene-card strong{overflow:hidden;font-size:9px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}.bottom-dock{width:calc(100vw - 12px);padding:8px}.gyro-control.available{position:fixed;right:12px;top:108px;z-index:16;display:inline-flex;align-items:center;min-height:34px;padding:0 10px;border:1px solid rgba(255,255,255,.34);border-radius:999px;background:rgba(7,32,69,.68);color:#fff;font-size:12px;font-weight:900;box-shadow:0 12px 32px rgba(0,0,0,.26);backdrop-filter:blur(18px)}.gyro-enabled .gyro-control{background:rgba(47,127,223,.82)}.is-cinematic .quick-toggle,.is-cinematic .gyro-control{opacity:0;pointer-events:none}}
.tour-stage canvas,.quick-stage,.quick-stage canvas{touch-action:none;overscroll-behavior:none}@media(max-width:860px){.music-control{right:0;top:calc(50% + 52px);min-height:44px;padding:0 10px;border-radius:999px 0 0 999px;transform:translateY(-50%)}.gyro-control.available{right:0;top:calc(50% + 104px);min-height:44px;padding:0 10px;border-radius:999px 0 0 999px;transform:translateY(-50%)}.quick-modal{align-items:stretch;padding:8px}.quick-panel{width:100%;height:100%;max-width:none;aspect-ratio:auto;border-radius:12px}.quick-stage canvas{display:block}.quick-modal h2{left:12px;top:12px}.quick-close{right:12px;top:12px}}
.tour-marker.video.video-small{width:auto;height:auto;min-width:68px;min-height:30px;padding:6px 11px 6px 27px;overflow:visible;border:1px solid rgba(255,255,255,.42);border-radius:999px;background:#155ca8;color:#fff;font-size:11px;line-height:1.2;box-shadow:0 8px 20px rgba(11,63,138,.3);backdrop-filter:none}.tour-marker.video.video-small:after{display:none}.tour-marker.video.video-small:before{left:11px;top:50%;border-top-width:5px;border-bottom-width:5px;border-left-width:8px;border-left-color:#fff;transform:translateY(-50%);filter:none}
.quick-entry button{transform:translateY(0) scale(1);transform-origin:left center;transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s ease,background-color .22s ease,border-color .22s ease;will-change:transform}.quick-entry-thumb{transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s ease}.quick-entry button:focus-visible{outline:2px solid rgba(255,255,255,.92);outline-offset:3px}@media(hover:hover) and (pointer:fine){.quick-entry button:hover{z-index:2;transform:translateY(-5px) scale(1.06);border-color:rgba(255,255,255,.7);background:rgba(18,65,122,.78);box-shadow:0 20px 44px rgba(0,0,0,.38)}.quick-entry button:hover .quick-entry-thumb{transform:scale(1.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.52),0 8px 18px rgba(0,0,0,.24)}.quick-entry button:active{transform:translateY(-2px) scale(1.03)}}@media(prefers-reduced-motion:reduce){.quick-entry button,.quick-entry-thumb{transition:none}}
</style>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.171.0/build/three.module.js"}}</script>
</head>
<body>
<canvas class="planet-intro-canvas" id="planetIntroCanvas" aria-hidden="true"></canvas>
<main class="tour-stage" id="stage"></main>
<div class="transition-snapshot" id="transitionSnapshot"></div>
<div class="markers" id="markers"></div>
<aside class="tour-title"><h1 id="title"></h1><p id="desc"></p></aside>
<aside class="quick-entry" id="quickEntry"></aside>
<button class="quick-toggle" id="quickToggle" type="button">快捷场景</button>
<button class="map-toggle" id="mapToggle" type="button">平面图</button>
<button class="gyro-control" id="gyroControl" type="button">开启陀螺仪</button>
<aside class="floating-map"><h2 id="mapTitle"></h2><div class="map-card" id="mapCard"></div></aside>
<section class="bottom-dock">
  <div class="scene-info"><h1 id="title"></h1><p id="desc"></p></div>
  <div class="scene-rail" id="sceneRail"></div>
</section>
<div class="scene-picker" id="scenePicker"></div>
<div class="motion-overlay" id="motionOverlay"><div class="motion-guide"><div class="motion-chip"><div class="motion-label" id="motionLabel">正在进入校园中</div><div class="motion-progress"><span id="motionProgress"></span></div></div><div class="motion-arrows"><span></span><span></span><span></span></div></div></div>
<div class="video-modal" id="videoModal"><button id="closeVideo">关闭</button><div id="videoMount"></div></div>
<div class="quick-modal" id="quickModal"><div class="quick-panel"><button class="quick-close" id="quickClose">关闭</button><h2 id="quickTitle"></h2><main class="quick-stage" id="quickStage"></main></div></div>
<audio id="bgMusic" src="./assets/audio/background.mp3" preload="auto" loop autoplay playsinline></audio>
<button class="music-control" id="musicControl" type="button">播放音乐</button>
<script type="module">
import * as THREE from 'three';
const fallbackProject=${projectExpression};
async function loadProjectData(){try{const response=await fetch(new URL('../data/project.json',import.meta.url),{cache:'no-store'});if(response.ok){const data=await response.json();if(data&&Array.isArray(data.scenes)&&data.scenes.length)return data}}catch(error){console.warn(error)}return fallbackProject}
const project=await loadProjectData();
project.scenes=(project.scenes||[]).map(function(scene){return {...scene,hotspots:scene.hotspots||[],videoUrl:'',videoSpots:scene.videoSpots||[]};});
const OPENING_SCENE_ID='outdoor-gate';
let activeScene=project.scenes.find(function(s){return s.id===OPENING_SCENE_ID})||project.scenes[0];project.activeSceneId=activeScene?activeScene.id:project.activeSceneId;
const STANDARD_LON=-24,STANDARD_LAT=1,REAR_LON=STANDARD_LON-180;
let lon=REAR_LON,lat=-88,targetLon=REAR_LON,targetLat=-88,dragging=false,startX=0,startY=0,dragFactorX=.12,dragFactorY=.12,isTouchDragging=false,isTransitioning=false,isIntro=true;
const stage=document.getElementById('stage'),transitionSnapshot=document.getElementById('transitionSnapshot'),markersRoot=document.getElementById('markers'),motionOverlay=document.getElementById('motionOverlay'),motionLabel=document.getElementById('motionLabel'),motionProgress=document.getElementById('motionProgress'),quickToggle=document.getElementById('quickToggle'),mapToggle=document.getElementById('mapToggle'),gyroControl=document.getElementById('gyroControl'),planetCanvas=document.getElementById('planetIntroCanvas'),planetCtx=planetCanvas.getContext('2d');
const scene3d=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,.1,1200);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setSize(window.innerWidth,window.innerHeight);stage.appendChild(renderer.domElement);
const geometry=new THREE.SphereGeometry(500,72,48);geometry.scale(-1,1,1);
let material=new THREE.MeshBasicMaterial({color:0x1f2937});
const sphere=new THREE.Mesh(geometry,material);scene3d.add(sphere);const animatedGroup=new THREE.Group();scene3d.add(animatedGroup);let animatedControllers=[];
const tileGroup=new THREE.Group();tileGroup.visible=false;scene3d.add(tileGroup);let tileMaterials=[];
const planetGeometry=new THREE.SphereGeometry(170,96,64);
const planet=new THREE.Mesh(planetGeometry,new THREE.MeshBasicMaterial({color:0x1f2937,transparent:true,opacity:0}));
planet.visible=false;scene3d.add(planet);
const loader=new THREE.TextureLoader();let markerModels=[],introImage=null,introPlanetImage=null;
function esc(s){return String(s||'').replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function groupOfScene(scene){for(let i=0;i<(project.groups||[]).length;i+=1){const group=project.groups[i];if((group.floors||[]).some(function(f){return f.id===scene.floorId}))return {group:group,index:i}}return null}
function isAuxGroup(group){const raw=String(group&&group.name||'');const name=raw.split(' ').join('').split('　').join('');return !!(group&&(group.hideFromNavigation||name==='大场景6'||(name.includes('大场景')&&name.includes('6'))))}
function isAuxScene(scene){const found=scene?groupOfScene(scene):null;return !!(found&&isAuxGroup(found.group))}
function floorOf(scene){for(const g of project.groups||[]){const f=(g.floors||[]).find(function(x){return x.id===scene.floorId});if(f)return {...f,groupName:g.name}}return null}
function primarySceneKey(scene){return scene&&scene.groupId?scene.groupId:scene&&scene.floorId?scene.floorId:''}
function sceneYaw(scene){const value=Number(scene&&scene.initialYaw);return Number.isFinite(value)?value:STANDARD_LON}
function scenePitch(scene){const value=Number(scene&&scene.initialPitch);return Number.isFinite(value)?Math.max(-78,Math.min(78,value)):STANDARD_LAT}
function sceneRoll(scene){const value=Number(scene&&scene.imageRoll);return Number.isFinite(value)?Math.max(-180,Math.min(180,value)):0}
function sceneRearYaw(scene){return sceneYaw(scene)-180}
function setScene(id){const next=project.scenes.find(function(s){return s.id===id});if(!next||next.id===activeScene.id||isTransitioning)return;transitionToScene(next)}
function setMotionProgress(value){motionProgress.style.transform='scaleX('+clamp01(value).toFixed(4)+')'}
function setMotion(open,label){if(label)motionLabel.textContent=label;if(open)setMotionProgress(0);motionOverlay.classList.toggle('open',!!open)}
let gyroEnabled=false,gyroCalibrated=false,gyroYawOffset=0,gyroPitchOffset=0;
const gyroEuler=new THREE.Euler(),gyroQuaternion=new THREE.Quaternion(),gyroScreenQuaternion=new THREE.Quaternion(),gyroDirection=new THREE.Vector3(),gyroZee=new THREE.Vector3(0,0,1),gyroQ1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5));
function normalizeAngle(value){return ((value+180)%360+360)%360-180}
function deviceView(event){if(event.alpha==null||event.beta==null||event.gamma==null)return null;const alpha=THREE.MathUtils.degToRad(event.alpha),beta=THREE.MathUtils.degToRad(event.beta),gamma=THREE.MathUtils.degToRad(event.gamma),orient=THREE.MathUtils.degToRad((screen.orientation&&Number(screen.orientation.angle))||Number(window.orientation)||0);gyroEuler.set(beta,alpha,-gamma,'YXZ');gyroQuaternion.setFromEuler(gyroEuler);gyroQuaternion.multiply(gyroQ1);gyroScreenQuaternion.setFromAxisAngle(gyroZee,-orient);gyroQuaternion.multiply(gyroScreenQuaternion);gyroDirection.set(0,0,-1).applyQuaternion(gyroQuaternion);return {yaw:THREE.MathUtils.radToDeg(Math.atan2(gyroDirection.z,gyroDirection.x)),pitch:THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(gyroDirection.y,-1,1)))}}
function handleDeviceOrientation(event){if(!gyroEnabled||dragging||isIntro||isTransitioning)return;const view=deviceView(event);if(!view)return;if(!gyroCalibrated){gyroYawOffset=targetLon-view.yaw;gyroPitchOffset=targetLat-view.pitch;gyroCalibrated=true;return}const desiredYaw=view.yaw+gyroYawOffset;targetLon+=normalizeAngle(desiredYaw-targetLon);targetLat=THREE.MathUtils.clamp(view.pitch+gyroPitchOffset,-78,78)}
async function toggleGyroscope(){if(gyroEnabled){gyroEnabled=false;gyroCalibrated=false;window.removeEventListener('deviceorientation',handleDeviceOrientation);document.body.classList.remove('gyro-enabled');gyroControl.textContent='开启陀螺仪';gyroControl.dataset.enabled='false';return}try{const orientationEvent=window.DeviceOrientationEvent;if(orientationEvent&&typeof orientationEvent.requestPermission==='function'){const permission=await orientationEvent.requestPermission();if(permission!=='granted')throw new Error('未获得方向传感器权限')}gyroEnabled=true;gyroCalibrated=false;window.addEventListener('deviceorientation',handleDeviceOrientation,true);document.body.classList.add('gyro-enabled');gyroControl.textContent='关闭陀螺仪';gyroControl.dataset.enabled='true'}catch(error){console.warn(error);window.alert('无法开启陀螺仪，请检查浏览器权限，并使用 HTTPS 页面访问。')}}
function disposeTileGroup(){tileGroup.clear();tileMaterials.forEach(function(m){if(m.map)m.map.dispose();m.dispose&&m.dispose()});tileMaterials=[]}
function textureFromUrl(url){return new Promise(function(resolve){loader.load(url,function(texture){texture.colorSpace=THREE.SRGBColorSpace;resolve(texture)},undefined,function(){resolve(null)})})}
function tilePatternUrl(tiles,face,row,col){return String(tiles.pattern||'').replaceAll('{face}',face).replaceAll('{level}',String(tiles.level||2)).replaceAll('{row}',String(row)).replaceAll('{col}',String(col))}
function makeTileMesh(face,row,col,grid,material){const size=1000/grid,half=500,x=-half+size*(col-.5),y=half-size*(row-.5),geo=new THREE.PlaneGeometry(size+0.6,size+0.6),mesh=new THREE.Mesh(geo,material);if(face==='f'){mesh.position.set(x,y,-half)}else if(face==='b'){mesh.position.set(-x,y,half);mesh.rotation.y=Math.PI}else if(face==='r'){mesh.position.set(half,y,x);mesh.rotation.y=-Math.PI/2}else if(face==='l'){mesh.position.set(-half,y,-x);mesh.rotation.y=Math.PI/2}else if(face==='u'){mesh.position.set(x,half,y);mesh.rotation.x=Math.PI/2}else if(face==='d'){mesh.position.set(x,-half,-y);mesh.rotation.x=-Math.PI/2}return mesh}
function loadKrpanoTiles(scene){const tiles=scene.krpanoTiles;return new Promise(function(resolve){disposeTileGroup();tileGroup.visible=false;sphere.visible=false;introImage=null;const faces=['f','r','b','l','u','d'],grid=Number(tiles.grid)||2,tasks=[];faces.forEach(function(face){for(let row=1;row<=grid;row+=1){for(let col=1;col<=grid;col+=1){tasks.push(textureFromUrl(tilePatternUrl(tiles,face,row,col)).then(function(texture){if(!texture)return;const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,side:THREE.DoubleSide});tileMaterials.push(mat);tileGroup.add(makeTileMesh(face,row,col,grid,mat))}))}}});Promise.all(tasks).then(function(){sphere.visible=false;tileGroup.rotation.y=THREE.MathUtils.degToRad(sceneRoll(scene));tileGroup.visible=true;resolve(true)})})}
function loadTextureImage(url){return new Promise(function(resolve){loader.load(url,function(texture){texture.colorSpace=THREE.SRGBColorSpace;introImage=texture.image;disposeTileGroup();tileGroup.visible=false;sphere.visible=true;const oldSphere=sphere.material;sphere.material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1});sphere.rotation.y=THREE.MathUtils.degToRad(sceneRoll(activeScene));sphere.rotation.z=0;oldSphere.dispose&&oldSphere.dispose();if(isIntro)try{renderIntroPlanet()}catch(error){console.warn(error)}resolve(texture)},undefined,function(){introImage=null;disposeTileGroup();tileGroup.visible=false;sphere.visible=true;sphere.material=new THREE.MeshBasicMaterial({color:0x233044,transparent:true,opacity:1});sphere.rotation.y=THREE.MathUtils.degToRad(sceneRoll(activeScene));sphere.rotation.z=0;resolve(null)})})}
function loadTexture(url){if(activeScene&&activeScene.krpanoTiles&&activeScene.krpanoTiles.pattern)return loadKrpanoTiles(activeScene);return loadTextureImage(url)}
function loadIntroPlanet(scene){return new Promise(function(resolve){introPlanetImage=null;const url=scene&&scene.planetUrl;if(!url){resolve(null);return}const image=new Image();image.onload=function(){introPlanetImage=image;resolve(image)};image.onerror=function(){console.warn('Little planet image failed to load:',url);resolve(null)};image.src=url})}
function applySceneUi(){document.getElementById('title').textContent=activeScene.name||'';document.getElementById('desc').textContent=activeScene.description||'';renderMarkers();renderAnimatedSpots(animatedGroup,activeScene,function(list){animatedControllers=list},animatedControllers);renderRail();renderMap();renderQuickLinks()}
function renderScene(options){applySceneUi();if(options&&options.skipTexture)return Promise.resolve();return loadTexture(activeScene.imageUrl)}
function directSwitchScene(next){transitionToScene(next)}
function renderMarkers(){markersRoot.innerHTML='';markerModels=[];const items=[...(activeScene.hotspots||[]).map(function(h){return {...h,type:'hotspot'}}),...(activeScene.videoSpots||[]).map(function(v){return {...v,type:'video'}})];items.forEach(function(item){const el=document.createElement('button'),videoStyle=item.displayStyle==='small'?'video-small':'video-large',minScale=item.type==='video'?0.1:0.7;el.className='tour-marker '+(item.type==='video'?'video '+videoStyle:'');el.textContent=item.label||'';el.onclick=function(e){e.stopPropagation();if(item.type==='video')openVideo(item.url);else if(item.targetSceneId)setScene(item.targetSceneId)};markersRoot.appendChild(el);const phi=THREE.MathUtils.degToRad(90-(item.pitch||0));const theta=THREE.MathUtils.degToRad(item.yaw||0);markerModels.push({el:el,scale:Math.max(minScale,Math.min(1.8,(Number(item.size)||100)/100)),position:new THREE.Vector3(490*Math.sin(phi)*Math.cos(theta),490*Math.cos(phi),490*Math.sin(phi)*Math.sin(theta))})})}
function placeAnimatedPlane(mesh,spot,aspect){const yaw=Number(spot.yaw)||0,pitch=Math.max(-75,Math.min(75,Number(spot.pitch)||0)),phi=THREE.MathUtils.degToRad(90-pitch),theta=THREE.MathUtils.degToRad(yaw),radius=475;mesh.position.set(radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta));mesh.lookAt(0,0,0);mesh.rotateZ(THREE.MathUtils.degToRad(Number(spot.rotation)||0));const width=90*Math.max(.1,Math.min(3,(Number(spot.size)||100)/100));mesh.scale.set(width,width/Math.max(.1,aspect||1),1)}
async function createAnimatedTexture(url,playCount,onReady){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:true}),texture=new THREE.CanvasTexture(canvas);canvas.width=2;canvas.height=2;texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;let disposed=false,timer=0,raf=0,decoder=null,objectUrl='';function resize(w,h){w=Math.max(1,Number(w)||1);h=Math.max(1,Number(h)||1);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}onReady&&onReady(w/h)}try{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('动态图片加载失败');const blob=await response.blob();if('ImageDecoder' in window){const fallback=String(url).toLowerCase().includes('.webp')?'image/webp':'image/gif';decoder=new window.ImageDecoder({data:await blob.arrayBuffer(),type:blob.type||fallback});await decoder.tracks.ready;const track=decoder.tracks.selectedTrack,frames=Math.max(1,Number(track&&track.frameCount)||1),loops=Math.max(0,Math.min(10,Number(playCount)||0));let index=0,completed=0;async function next(){if(disposed)return;try{const result=await decoder.decode({frameIndex:index}),frame=result.image;resize(frame.displayWidth||frame.codedWidth,frame.displayHeight||frame.codedHeight);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(frame,0,0,canvas.width,canvas.height);texture.needsUpdate=true;const duration=Math.max(20,Number(frame.duration||100000)/1000);frame.close();index+=1;if(index>=frames){index=0;completed+=1;if(loops>0&&completed>=loops)return}timer=setTimeout(next,duration)}catch(error){if(!disposed&&error&&error.name!=='AbortError')console.warn(error)}}next()}else{const image=new Image();objectUrl=URL.createObjectURL(blob);image.src=objectUrl;await new Promise(function(resolve,reject){image.onload=resolve;image.onerror=reject});resize(image.naturalWidth,image.naturalHeight);function draw(){if(disposed)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);texture.needsUpdate=true;raf=requestAnimationFrame(draw)}draw()}}catch(error){if(!disposed&&error&&error.name!=='AbortError')console.warn(error)}return{texture:texture,dispose:function(){disposed=true;clearTimeout(timer);cancelAnimationFrame(raf);decoder&&decoder.close&&decoder.close();if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';texture.dispose()}}}
function clearAnimatedSpots(group,controllers){(controllers||[]).forEach(function(controller){controller.dispose()});group.children.slice().forEach(function(mesh){group.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()})}
function renderAnimatedSpots(group,scene,setControllers,oldControllers){clearAnimatedSpots(group,oldControllers);const controllers=[];setControllers(controllers);(scene.animatedSpots||[]).filter(function(spot){return spot.imageUrl}).forEach(function(spot){const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide,depthTest:false,depthWrite:false}),mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.renderOrder=12;placeAnimatedPlane(mesh,spot,1);group.add(mesh);createAnimatedTexture(spot.imageUrl,spot.playCount,function(aspect){placeAnimatedPlane(mesh,spot,aspect)}).then(function(controller){if(!group.children.includes(mesh)){controller.dispose();return}controllers.push(controller);material.map=controller.texture;material.opacity=1;material.needsUpdate=true})})}
function renderRail(){const rail=document.getElementById('sceneRail'),picker=document.getElementById('scenePicker'),dock=document.querySelector('.bottom-dock');const buckets=[];(project.groups||[]).forEach(function(g){if(isAuxGroup(g))return;const floorIds=(g.floors||[]).map(function(f){return f.id});const list=(project.scenes||[]).filter(function(s){return floorIds.includes(s.floorId)});if(list.length)buckets.push({g:g,list:list})});rail.innerHTML=buckets.map(function(b){return '<div class="floor-bucket"><button class="floor-card '+(b.list.some(function(s){return s.id===activeScene.id})?'active':'')+'" data-group="'+esc(b.g.id)+'"><strong>'+esc(b.g.name)+'</strong><small>'+b.list.length+' 个场景</small></button></div>'}).join('');rail.querySelectorAll('[data-group]').forEach(function(btn){btn.onclick=function(){const bucket=buckets.find(function(x){return x.g.id===btn.dataset.group});if(!bucket)return;const rect=btn.getBoundingClientRect();picker.style.left=window.innerWidth<860?'6px':Math.min(Math.max(rect.left,18),window.innerWidth-360)+'px';picker.innerHTML=bucket.list.map(function(s){const f=floorOf(s);return '<button class="scene-card '+(s.id===activeScene.id?'active':'')+'" data-id="'+esc(s.id)+'"><span style="background-image:url('+esc(s.thumbnailUrl||s.imageUrl)+')"></span><div><strong>'+esc(s.name)+'</strong><small>'+esc(bucket.g.name+' / '+((f&&f.name)||''))+'</small></div></button>'}).join('');picker.classList.toggle('open',picker.dataset.group!==bucket.g.id||!picker.classList.contains('open'));dock.classList.toggle('is-open',picker.classList.contains('open'));picker.dataset.group=bucket.g.id;picker.querySelectorAll('[data-id]').forEach(function(item){item.onclick=function(){setScene(item.dataset.id);closeScenePicker()}})}})}
function renderMap(){const panel=document.querySelector('.floating-map');if(isAuxScene(activeScene)){document.body.classList.add('map-unavailable');document.body.classList.remove('map-open');panel.style.display='none';return}document.body.classList.remove('map-unavailable');panel.style.display='';const floor=floorOf(activeScene);document.getElementById('mapTitle').textContent=((floor&&floor.groupName)||'地图')+' / '+((floor&&floor.name)||'');const same=(project.scenes||[]).filter(function(s){return s.floorId===activeScene.floorId});const dots=same.map(function(s,index){const pos=(floor&&floor.mapType)==='campus'?s.campusPosition:s.mapPosition;return '<span class="map-dot '+(s.id===activeScene.id?'is-active':'')+'" title="'+esc(s.name)+'" style="left:'+((pos&&pos.x)||50)+'%;top:'+((pos&&pos.y)||50)+'%">'+(s.id===activeScene.id?'●':index+1)+'</span>'}).join('');const map=(project.floorMaps||{})[activeScene.floorId];const mapHtml=map&&map.imageUrl?'<img class="simple-map" src="'+esc(map.imageUrl)+'" alt="map">':((floor&&floor.mapType)==='campus'?campusSvg():floorSvg());document.getElementById('mapCard').innerHTML=mapHtml+dots}
function renderQuickLinks(){const root=document.getElementById('quickEntry');if(!root)return;const valid=(project.quickLinks||[]).map(function(link){const scene=(project.scenes||[]).find(function(item){return item.id===link.targetSceneId});return scene?{link:link,scene:scene}:null}).filter(Boolean);document.body.classList.toggle('quick-unavailable',valid.length===0);root.innerHTML=valid.map(function(item){const thumb=item.scene.thumbnailUrl||item.scene.imageUrl||'',action=item.link.action==='navigate'?'navigate':'modal';return '<button type="button" data-quick-scene="'+esc(item.link.targetSceneId)+'" data-quick-action="'+action+'"><span class="quick-entry-thumb" style="background-image:url('+esc(thumb)+')"></span><span class="quick-entry-label">'+esc(item.link.label||item.scene.name||'查看场景')+'</span></button>'}).join('');root.querySelectorAll('[data-quick-scene]').forEach(function(btn){btn.onclick=function(){document.body.classList.remove('quick-open');if(btn.dataset.quickAction==='navigate')setScene(btn.dataset.quickScene);else openQuickScene(btn.dataset.quickScene)}})}
let quickViewer=null;
function ensureQuickViewer(){if(quickViewer)return quickViewer;const quickStage=document.getElementById('quickStage'),quickScene3d=new THREE.Scene(),quickCamera=new THREE.PerspectiveCamera(70,16/9,.1,1200),quickRenderer=new THREE.WebGLRenderer({antialias:true});quickRenderer.setPixelRatio(Math.min(window.devicePixelRatio,2));quickStage.appendChild(quickRenderer.domElement);const quickGeometry=new THREE.SphereGeometry(500,72,48);quickGeometry.scale(-1,1,1);const quickMesh=new THREE.Mesh(quickGeometry,new THREE.MeshBasicMaterial({color:0x102033}));quickScene3d.add(quickMesh);const quickTileGroup=new THREE.Group();quickTileGroup.visible=false;quickScene3d.add(quickTileGroup);const state={stage:quickStage,scene:quickScene3d,camera:quickCamera,renderer:quickRenderer,mesh:quickMesh,tileGroup:quickTileGroup,tileMaterials:[],markerModels:[],lon:STANDARD_LON,lat:STANDARD_LAT,targetLon:STANDARD_LON,targetLat:STANDARD_LAT,dragging:false,touchDragging:false,touchId:null,startX:0,startY:0,dragFactorX:.12,dragFactorY:.12,texture:null};function resize(){const rect=quickStage.getBoundingClientRect(),w=Math.max(1,Math.floor(rect.width)),h=Math.max(1,Math.floor(rect.height));quickCamera.aspect=w/h;quickCamera.updateProjectionMatrix();quickRenderer.setSize(w,h)}state.resize=resize;function prepareDrag(x,y,touch){state.dragging=true;state.touchDragging=touch;state.dragFactorX=touch?Math.max(.42,180/Math.max(quickStage.clientWidth,320)):.12;state.dragFactorY=touch?Math.max(.12,90/Math.max(quickStage.clientHeight,480)):.12;state.startX=x;state.startY=y;quickStage.dataset.dragInput=touch?'touch':'pointer';quickStage.dataset.dragSensitivity=state.dragFactorX.toFixed(3)}function applyDrag(x,y){state.targetLon+=(x-state.startX)*state.dragFactorX;state.targetLat=THREE.MathUtils.clamp(state.targetLat+(y-state.startY)*state.dragFactorY,-78,78);if(state.touchDragging){state.lon=state.targetLon;state.lat=state.targetLat}state.startX=x;state.startY=y}function finishDrag(){state.dragging=false;state.touchDragging=false;state.touchId=null}function frame(){requestAnimationFrame(frame);const follow=state.dragging&&state.touchDragging?1:(window.innerWidth<860?.24:.08);state.lon+=(state.targetLon-state.lon)*follow;state.lat+=(state.targetLat-state.lat)*follow;state.lat=Math.max(-88,Math.min(78,state.lat));const phi=THREE.MathUtils.degToRad(90-state.lat),theta=THREE.MathUtils.degToRad(state.lon);quickCamera.position.set(0,0,0);quickCamera.lookAt(500*Math.sin(phi)*Math.cos(theta),500*Math.cos(phi),500*Math.sin(phi)*Math.sin(theta));state.markerModels.forEach(function(m){const v=m.position.clone().project(quickCamera),visible=v.z<1;m.el.style.transform='translate3d('+((v.x*.5+.5)*quickStage.clientWidth)+'px,'+((-v.y*.5+.5)*quickStage.clientHeight)+'px,0) translate(-50%,-50%) scale('+(m.scale||1)+')';m.el.style.opacity=visible?'1':'0';m.el.style.pointerEvents=visible?'auto':'none';m.el.style.zIndex=String(Math.round((1-v.z)*1000)+5)});quickRenderer.render(quickScene3d,quickCamera)}quickStage.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&'ontouchstart' in window)return;prepareDrag(e.clientX,e.clientY,false);try{quickStage.setPointerCapture(e.pointerId)}catch(error){console.warn(error)}});quickStage.addEventListener('pointermove',function(e){if(!state.dragging||state.touchDragging)return;const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];events.forEach(function(item){applyDrag(item.clientX,item.clientY)})});quickStage.addEventListener('pointerup',finishDrag);quickStage.addEventListener('pointercancel',finishDrag);quickStage.addEventListener('touchstart',function(e){if(e.touches.length!==1)return;const touch=e.touches[0];state.touchId=touch.identifier;prepareDrag(touch.clientX,touch.clientY,true);e.preventDefault()},{passive:false});window.addEventListener('touchmove',function(e){if(state.touchId==null||!state.dragging)return;const touch=Array.from(e.touches).find(function(item){return item.identifier===state.touchId});if(!touch)return;applyDrag(touch.clientX,touch.clientY);e.preventDefault()},{passive:false});window.addEventListener('touchend',function(e){if(state.touchId==null)return;if(Array.from(e.changedTouches).some(function(item){return item.identifier===state.touchId}))finishDrag()},{passive:true});window.addEventListener('touchcancel',finishDrag,{passive:true});quickStage.addEventListener('wheel',function(e){e.preventDefault();quickCamera.fov=THREE.MathUtils.clamp(quickCamera.fov+e.deltaY*.03,38,88);quickCamera.updateProjectionMatrix()},{passive:false});window.addEventListener('resize',resize);quickViewer=state;resize();frame();return quickViewer}
function disposeQuickTiles(quick){quick.tileGroup.clear();quick.tileMaterials.forEach(function(m){if(m.map)m.map.dispose();m.dispose&&m.dispose()});quick.tileMaterials=[]}
function resetQuickView(quick,scene){const yaw=sceneYaw(scene),pitch=scenePitch(scene),roll=sceneRoll(scene);quick.dragging=false;quick.lon=yaw;quick.targetLon=yaw;quick.lat=pitch;quick.targetLat=pitch;quick.camera.fov=70;quick.camera.updateProjectionMatrix();quick.mesh.rotation.y=THREE.MathUtils.degToRad(roll);quick.tileGroup.rotation.y=THREE.MathUtils.degToRad(roll);quick.resize&&quick.resize();const phi=THREE.MathUtils.degToRad(90-pitch),theta=THREE.MathUtils.degToRad(yaw);quick.camera.position.set(0,0,0);quick.camera.lookAt(500*Math.sin(phi)*Math.cos(theta),500*Math.cos(phi),500*Math.sin(phi)*Math.sin(theta));quick.renderer.render(quick.scene,quick.camera)}
function loadQuickScene(quick,scene){if(scene&&scene.krpanoTiles&&scene.krpanoTiles.pattern){const tiles=scene.krpanoTiles,faces=['f','r','b','l','u','d'],grid=Number(tiles.grid)||1,tasks=[];disposeQuickTiles(quick);if(quick.texture){quick.texture.dispose();quick.texture=null}quick.mesh.visible=false;quick.tileGroup.visible=false;faces.forEach(function(face){for(let row=1;row<=grid;row+=1){for(let col=1;col<=grid;col+=1){tasks.push(textureFromUrl(tilePatternUrl(tiles,face,row,col)).then(function(texture){if(!texture)return;const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:1,side:THREE.DoubleSide});quick.tileMaterials.push(mat);quick.tileGroup.add(makeTileMesh(face,row,col,grid,mat))}))}}});return Promise.all(tasks).then(function(){quick.tileGroup.rotation.y=THREE.MathUtils.degToRad(sceneRoll(scene));quick.tileGroup.visible=true;resetQuickView(quick,scene)})}disposeQuickTiles(quick);quick.tileGroup.visible=false;quick.mesh.visible=true;return new Promise(function(resolve){loader.load(scene.imageUrl,function(texture){texture.colorSpace=THREE.SRGBColorSpace;if(quick.texture)quick.texture.dispose();quick.texture=texture;const old=quick.mesh.material;quick.mesh.material=new THREE.MeshBasicMaterial({map:texture});old.dispose&&old.dispose();resetQuickView(quick,scene);resolve()},undefined,function(){const old=quick.mesh.material;quick.mesh.material=new THREE.MeshBasicMaterial({color:0x102033});old.dispose&&old.dispose();resetQuickView(quick,scene);resolve()})})}
function renderQuickMarkers(quick,scene){quick.markerModels.forEach(function(m){m.el.remove()});quick.markerModels=[];const items=[...(scene.hotspots||[]).map(function(h){return {...h,type:'hotspot'}}),...(scene.videoSpots||[]).map(function(v){return {...v,type:'video'}})];items.forEach(function(item){const el=document.createElement('button'),videoStyle=item.displayStyle==='small'?'video-small':'video-large',minScale=item.type==='video'?0.1:0.7;el.className='tour-marker '+(item.type==='video'?'video '+videoStyle:'');el.textContent=item.label||'';el.onpointerdown=function(e){e.stopPropagation()};el.ontouchstart=function(e){e.stopPropagation()};el.onclick=function(e){e.stopPropagation();if(item.type==='video')openVideo(item.url);else if(item.targetSceneId)openQuickScene(item.targetSceneId)};quick.stage.appendChild(el);const phi=THREE.MathUtils.degToRad(90-(item.pitch||0)),theta=THREE.MathUtils.degToRad(item.yaw||0);quick.markerModels.push({el:el,scale:Math.max(minScale,Math.min(1.8,(Number(item.size)||100)/100)),position:new THREE.Vector3(490*Math.sin(phi)*Math.cos(theta),490*Math.cos(phi),490*Math.sin(phi)*Math.sin(theta))})})}
function openQuickScene(id){const scene=(project.scenes||[]).find(function(item){return item.id===id});if(!scene)return;const modal=document.getElementById('quickModal'),title=document.getElementById('quickTitle');title.textContent=scene.name||'场景预览';modal.classList.add('open');const quick=ensureQuickViewer();if(!quick.animatedGroup){quick.animatedGroup=new THREE.Group();quick.scene.add(quick.animatedGroup);quick.animatedControllers=[]}quick.resize();requestAnimationFrame(quick.resize);resetQuickView(quick,scene);renderQuickMarkers(quick,scene);renderAnimatedSpots(quick.animatedGroup,scene,function(list){quick.animatedControllers=list},quick.animatedControllers);loadQuickScene(quick,scene).then(function(){quick.resize();resetQuickView(quick,scene)})}
function closeQuickScene(){document.getElementById('quickModal').classList.remove('open');if(quickViewer&&quickViewer.animatedGroup){clearAnimatedSpots(quickViewer.animatedGroup,quickViewer.animatedControllers);quickViewer.animatedControllers=[]}}
function easeInOut(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function tween(duration,onUpdate,onDone){const start=performance.now();function frame(now){const raw=clamp01((now-start)/duration);const eased=easeInOut(raw);onUpdate(eased,raw);if(raw<1)requestAnimationFrame(frame);else if(onDone)onDone()}requestAnimationFrame(frame)}
function tweenPromise(duration,onUpdate){return new Promise(function(resolve){tween(duration,onUpdate,resolve)})}
function setCanvasMotion(blur,scale,opacity){renderer.domElement.style.filter='blur('+blur.toFixed(2)+'px) saturate('+(1+blur*.025).toFixed(2)+')';renderer.domElement.style.transform='scale('+scale.toFixed(3)+')';if(typeof opacity==='number')renderer.domElement.style.opacity=String(opacity)}
function clearCanvasMotion(){renderer.domElement.style.filter='';renderer.domElement.style.transform='';renderer.domElement.style.opacity=''}
function setSnapshotMotion(opacity,scale,blur){transitionSnapshot.style.opacity=String(opacity);transitionSnapshot.style.transform='scale('+scale.toFixed(3)+')';transitionSnapshot.style.filter='blur('+blur.toFixed(2)+'px)'}
function clearSnapshotMotion(){transitionSnapshot.style.opacity='0';transitionSnapshot.style.transform='scale(1)';transitionSnapshot.style.filter='';transitionSnapshot.style.backgroundImage=''}
function transitionToScene(next){isTransitioning=true;closeScenePicker();setMotion(false);markersRoot.style.opacity='0';renderer.render(scene3d,camera);let snapshot='';try{snapshot=renderer.domElement.toDataURL('image/jpeg',.86)}catch(error){snapshot=''}if(snapshot)transitionSnapshot.style.backgroundImage='url("'+snapshot+'")';setSnapshotMotion(snapshot?1:0,1,0);clearCanvasMotion();const destYaw=sceneYaw(next),destPitch=scenePitch(next),startYaw=destYaw-12,startPitch=destPitch+1.5;const blurOld=tweenPromise(260,function(e){setSnapshotMotion(snapshot?1:0,1+.02*e,7*e);setCanvasMotion(7*e,1+.035*e,1)});activeScene=next;const loadNext=loadTexture(activeScene.imageUrl);Promise.all([blurOld,loadNext]).then(function(){applySceneUi();lon=startYaw;lat=startPitch;targetLon=startYaw;targetLat=startPitch;camera.fov=82;camera.updateProjectionMatrix();if(sphere.material)sphere.material.opacity=1;setCanvasMotion(7,1.12,1);setSnapshotMotion(snapshot?1:0,1.02,7);tween(980,function(e){camera.fov=82+(70-82)*e;camera.updateProjectionMatrix();targetLon=startYaw+12*e;targetLat=startPitch-1.5*e;setSnapshotMotion(snapshot?1-e:0,1.02+.18*e,7);setCanvasMotion(7*(1-e),1.12-.12*e,1)},function(){camera.fov=70;camera.updateProjectionMatrix();if(sphere.material)sphere.material.opacity=1;targetLon=destYaw;targetLat=destPitch;markersRoot.style.opacity='';clearCanvasMotion();clearSnapshotMotion();isTransitioning=false})}).catch(function(error){console.error(error);markersRoot.style.opacity='';clearCanvasMotion();clearSnapshotMotion();isTransitioning=false})}
function runIntro(){if(!activeScene)return;const finalYaw=sceneYaw(activeScene),finalPitch=scenePitch(activeScene),rearYaw=sceneRearYaw(activeScene);document.body.classList.add('is-cinematic');setMotion(true,'正在进入校园中');isIntro=true;markersRoot.style.opacity='0';sphere.visible=false;planet.visible=false;showIntroPlaceholder(activeScene);planetCanvas.classList.add('show');setPlanetIntroStyle(1,1,0);try{renderIntroPlanet()}catch(error){console.warn(error)}camera.fov=86;camera.updateProjectionMatrix();tween(1400,function(e,raw){const enter=clamp01((raw-.34)/.66);const turn=clamp01(raw/.74);setMotionProgress(raw*.7);setPlanetIntroStyle(1-enter,1+enter*4.6,enter*4.5);if(enter>.08&&!activeScene.krpanoTiles){sphere.visible=true;if(sphere.material)sphere.material.opacity=enter}camera.fov=86+(70-86)*enter;camera.updateProjectionMatrix();const y=760*(1-enter);const z=620*(1-enter);camera.position.set(0,y,z);camera.lookAt(0,0,0);lat=-88+(finalPitch+88)*enter;lon=rearYaw+38*turn;targetLat=lat;targetLon=lon},function(){hidePlanetIntro();sphere.visible=!activeScene.krpanoTiles;if(sphere.material)sphere.material.opacity=1;isIntro=false;lat=finalPitch;targetLat=finalPitch;lon=rearYaw;targetLon=rearYaw;tween(600,function(e,raw){setMotionProgress(.7+raw*.3);lon=rearYaw+180*e;targetLon=lon;camera.fov=70;camera.updateProjectionMatrix()},function(){setMotionProgress(1);lon=finalYaw;targetLon=finalYaw;lat=finalPitch;targetLat=finalPitch;markersRoot.style.opacity='';document.body.classList.remove('is-cinematic');setMotion(false)})})}
function resizePlanetCanvas(){const dpr=Math.min(window.devicePixelRatio||1,2);planetCanvas.width=Math.max(1,Math.floor(window.innerWidth*dpr));planetCanvas.height=Math.max(1,Math.floor(window.innerHeight*dpr));planetCanvas.style.width=window.innerWidth+'px';planetCanvas.style.height=window.innerHeight+'px';return dpr}
function drawSkyBackground(ctx,w,h){const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#22c4f5');sky.addColorStop(.46,'#99e5ff');sky.addColorStop(1,'#f1fbff');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);const sun=ctx.createRadialGradient(w*.36,h*.42,0,w*.36,h*.42,Math.min(w,h)*.32);sun.addColorStop(0,'rgba(255,229,123,.72)');sun.addColorStop(.42,'rgba(255,237,164,.34)');sun.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=sun;ctx.fillRect(0,0,w,h);const glow=ctx.createRadialGradient(w*.5,h*.56,0,w*.5,h*.56,Math.min(w,h)*.46);glow.addColorStop(0,'rgba(255,255,255,.5)');glow.addColorStop(.48,'rgba(255,255,255,.22)');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h)}
function showIntroPlaceholder(scene){resizePlanetCanvas();planetCtx.clearRect(0,0,planetCanvas.width,planetCanvas.height);const url=scene&&scene.planetPreviewUrl;if(url){planetCanvas.style.backgroundImage='url("'+String(url).replaceAll('"','%22')+'")';planetCanvas.style.backgroundPosition='center';planetCanvas.style.backgroundRepeat='no-repeat';planetCanvas.style.backgroundSize='cover';planetCanvas.dataset.planetReady='preview'}else{planetCanvas.style.backgroundImage='none';drawSkyBackground(planetCtx,planetCanvas.width,planetCanvas.height);planetCanvas.dataset.planetReady='sky'}}
function clearIntroPlaceholder(){planetCanvas.style.backgroundImage='none'}
function drawIntroPlanetArtwork(image){resizePlanetCanvas();clearIntroPlaceholder();const w=planetCanvas.width,h=planetCanvas.height;drawSkyBackground(planetCtx,w,h);if(!image){planetCanvas.dataset.planetReady='sky';return}const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height,scale=Math.max(w/iw,h/ih),dw=iw*scale,dh=ih*scale;planetCtx.drawImage(image,(w-dw)/2,(h-dh)/2,dw,dh);planetCanvas.dataset.planetReady='artwork'}
function renderIntroPlanet(){if(introPlanetImage)drawIntroPlanetArtwork(introPlanetImage);else buildLittlePlanet(introImage)}
function buildLittlePlanet(image){clearIntroPlaceholder();const dpr=resizePlanetCanvas(),w=planetCanvas.width,h=planetCanvas.height;drawSkyBackground(planetCtx,w,h);planetCanvas.dataset.planetReady='sky';const size=Math.min(920,Math.floor(Math.min(w,h)*.86)),cx=w*.5,cy=h*.57;if(!image)return;planetCtx.save();planetCtx.shadowColor='rgba(13,70,112,.3)';planetCtx.shadowBlur=28*dpr;planetCtx.shadowOffsetY=18*dpr;planetCtx.beginPath();planetCtx.arc(cx,cy,size*.48,0,Math.PI*2);planetCtx.clip();try{planetCtx.drawImage(image,cx-size/2,cy-size/2,size,size);planetCanvas.dataset.planetReady='fallback'}catch(error){planetCanvas.dataset.planetReady='image-error';planetCtx.restore();return}planetCtx.restore();planetCtx.save();planetCtx.beginPath();planetCtx.arc(cx,cy,size*.49,0,Math.PI*2);planetCtx.strokeStyle='rgba(255,255,255,.72)';planetCtx.lineWidth=2*dpr;planetCtx.stroke();planetCtx.restore();const src=document.createElement('canvas');const sw=Math.min(1200,image.naturalWidth||image.width||1200),sh=Math.min(600,image.naturalHeight||image.height||600);src.width=sw;src.height=sh;const sctx=src.getContext('2d',{willReadFrequently:true});try{sctx.drawImage(image,0,0,sw,sh)}catch(error){return}let srcData;try{srcData=sctx.getImageData(0,0,sw,sh).data}catch(error){planetCanvas.dataset.planetReady='fallback';return}const out=document.createElement('canvas');out.width=size;out.height=size;const octx=out.getContext('2d');const img=octx.createImageData(size,size);const data=img.data,c=size/2,radius=size*.48;for(let y=0;y<size;y+=1){for(let x=0;x<size;x+=1){const dx=x-c,dy=y-c;const r=Math.sqrt(dx*dx+dy*dy);const p=(y*size+x)*4;if(r>radius){data[p+3]=0;continue}const rn=Math.pow(r/radius,.72);let angle=Math.atan2(dx,-dy)/(Math.PI*2)+.5;angle=angle-Math.floor(angle);const sx=Math.max(0,Math.min(sw-1,Math.floor(angle*sw)));const sy=Math.max(0,Math.min(sh-1,Math.floor((1-rn)*sh)));const sp=(sy*sw+sx)*4;data[p]=srcData[sp];data[p+1]=srcData[sp+1];data[p+2]=srcData[sp+2];data[p+3]=255}}octx.putImageData(img,0,0);planetCtx.save();planetCtx.shadowColor='rgba(13,70,112,.28)';planetCtx.shadowBlur=26*dpr;planetCtx.shadowOffsetY=18*dpr;planetCtx.drawImage(out,cx-size/2,cy-size/2,size,size);planetCtx.restore();planetCanvas.dataset.planetReady='generated'}
function setPlanetIntroStyle(opacity,scale,blur){planetCanvas.style.opacity=String(opacity);planetCanvas.style.transform='scale('+scale.toFixed(3)+')';planetCanvas.style.filter='blur('+blur.toFixed(2)+'px)'}
function hidePlanetIntro(){planetCanvas.classList.remove('show');setPlanetIntroStyle(0,1,0)}
function openVideo(url){const modal=document.getElementById('videoModal'),mount=document.getElementById('videoMount');if(!url){mount.innerHTML='<div class="video-frame video-empty">请先在后台为该视频点位配置视频链接</div>';modal.classList.add('open');return}const mp4=/\\.(mp4|webm|ogg)(\\?|#|$)/i.test(url);mount.innerHTML=mp4?'<video class="video-frame" src="'+esc(url)+'" controls autoplay></video>':'<iframe class="video-frame" src="'+esc(url)+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';modal.classList.add('open')}
function closeVideo(){const modal=document.getElementById('videoModal');modal.classList.remove('open');document.getElementById('videoMount').innerHTML=''}
function closeScenePicker(){document.getElementById('scenePicker').classList.remove('open');document.querySelector('.bottom-dock').classList.remove('is-open')}
let scenePickerCloseTimer;function scheduleScenePickerClose(){clearTimeout(scenePickerCloseTimer);scenePickerCloseTimer=setTimeout(function(){const dock=document.querySelector('.bottom-dock'),picker=document.getElementById('scenePicker');if(!dock.matches(':hover')&&!picker.matches(':hover'))closeScenePicker()},120)}function cancelScenePickerClose(){clearTimeout(scenePickerCloseTimer)}
const bgMusic=document.getElementById('bgMusic'),musicControl=document.getElementById('musicControl');function setMusicButton(show,text){if(!musicControl)return;musicControl.textContent=text||'播放音乐';musicControl.classList.toggle('show',!!show)}function syncMusicButton(){setMusicButton(window.innerWidth<860||bgMusic.paused,bgMusic.paused?'播放音乐':'暂停音乐')}function playBackgroundMusic(){if(!bgMusic)return;bgMusic.volume=.36;bgMusic.muted=false;const result=bgMusic.play();if(result&&result.then)result.then(syncMusicButton).catch(function(){setMusicButton(true,'播放音乐')});else syncMusicButton()}function toggleBackgroundMusic(){if(bgMusic.paused)playBackgroundMusic();else{bgMusic.pause();syncMusicButton()}}function unlockBackgroundMusic(){playBackgroundMusic();window.removeEventListener('pointerdown',unlockBackgroundMusic);window.removeEventListener('keydown',unlockBackgroundMusic);window.removeEventListener('touchstart',unlockBackgroundMusic)}bgMusic.addEventListener('play',syncMusicButton);bgMusic.addEventListener('pause',syncMusicButton);window.addEventListener('pointerdown',unlockBackgroundMusic,{once:true});window.addEventListener('keydown',unlockBackgroundMusic,{once:true});window.addEventListener('touchstart',unlockBackgroundMusic,{once:true,passive:true});setMusicButton(window.innerWidth<860,'播放音乐');setTimeout(playBackgroundMusic,480);
document.getElementById('closeVideo').onclick=closeVideo;
document.getElementById('quickClose').onclick=closeQuickScene;
quickToggle.onclick=function(e){e.stopPropagation();const open=!document.body.classList.contains('quick-open');document.body.classList.toggle('quick-open',open);if(open)document.body.classList.remove('map-open')};
mapToggle.onclick=function(e){e.stopPropagation();const open=!document.body.classList.contains('map-open');document.body.classList.toggle('map-open',open);if(open)document.body.classList.remove('quick-open')};
if('DeviceOrientationEvent' in window)gyroControl.classList.add('available');gyroControl.onclick=function(e){e.stopPropagation();toggleGyroscope()};
musicControl.onclick=function(e){e.stopPropagation();toggleBackgroundMusic()};
let activeTouchId=null;
function prepareMainDrag(x,y,touch){dragging=true;isTouchDragging=touch;dragFactorX=touch?Math.max(.42,180/Math.max(window.innerWidth,320)):.12;dragFactorY=touch?Math.max(.12,90/Math.max(window.innerHeight,480)):.12;stage.dataset.dragSensitivity=dragFactorX.toFixed(3);stage.dataset.dragInput=touch?'touch':'pointer';startX=x;startY=y;document.body.classList.remove('quick-open','map-open')}
function applyMainDrag(x,y){const dx=x-startX,dy=y-startY;targetLon+=dx*dragFactorX;targetLat=THREE.MathUtils.clamp(targetLat+dy*dragFactorY,-78,78);if(isTouchDragging){lon=targetLon;lat=targetLat}startX=x;startY=y}
function finishDrag(){dragging=false;isTouchDragging=false;activeTouchId=null;if(gyroEnabled)gyroCalibrated=false}
stage.addEventListener('pointerdown',function(e){if(e.pointerType==='touch'&&'ontouchstart' in window)return;prepareMainDrag(e.clientX,e.clientY,false);try{stage.setPointerCapture(e.pointerId)}catch(error){console.warn(error)}});
stage.addEventListener('pointermove',function(e){if(!dragging||isTouchDragging)return;const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];events.forEach(function(item){applyMainDrag(item.clientX,item.clientY)})});
stage.addEventListener('pointerup',finishDrag);stage.addEventListener('pointercancel',finishDrag);
stage.addEventListener('touchstart',function(e){if(e.touches.length!==1)return;const touch=e.touches[0];activeTouchId=touch.identifier;prepareMainDrag(touch.clientX,touch.clientY,true);e.preventDefault()},{passive:false});
window.addEventListener('touchmove',function(e){if(activeTouchId==null||!dragging)return;const touch=Array.from(e.touches).find(function(item){return item.identifier===activeTouchId});if(!touch)return;applyMainDrag(touch.clientX,touch.clientY);e.preventDefault()},{passive:false});
window.addEventListener('touchend',function(e){if(activeTouchId==null)return;if(Array.from(e.changedTouches).some(function(item){return item.identifier===activeTouchId}))finishDrag()},{passive:true});
window.addEventListener('touchcancel',finishDrag,{passive:true});
stage.addEventListener('wheel',function(e){e.preventDefault();camera.fov=THREE.MathUtils.clamp(camera.fov+e.deltaY*.03,38,88);camera.updateProjectionMatrix()},{passive:false});
document.getElementById('sceneRail').addEventListener('wheel',function(e){if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.preventDefault();this.scrollLeft+=e.deltaY}},{passive:false});
document.querySelector('.bottom-dock').addEventListener('mouseleave',scheduleScenePickerClose);document.querySelector('.bottom-dock').addEventListener('mouseenter',cancelScenePickerClose);document.getElementById('scenePicker').addEventListener('mouseleave',scheduleScenePickerClose);document.getElementById('scenePicker').addEventListener('mouseenter',cancelScenePickerClose);stage.addEventListener('pointerdown',closeScenePicker);
window.addEventListener('resize',function(){camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);syncMusicButton();if(isIntro)renderIntroPlanet()});
function animate(){requestAnimationFrame(animate);animatedGroup.visible=!isIntro&&!isTransitioning;if(!isIntro){const follow=window.innerWidth<860?0.22:0.08;lon+=(targetLon-lon)*follow;lat+=(targetLat-lat)*follow;lat=Math.max(-88,Math.min(78,lat));const phi=THREE.MathUtils.degToRad(90-lat),theta=THREE.MathUtils.degToRad(lon);camera.position.set(0,0,0);camera.lookAt(500*Math.sin(phi)*Math.cos(theta),500*Math.cos(phi),500*Math.sin(phi)*Math.sin(theta));markerModels.forEach(function(m){const v=m.position.clone().project(camera);const visible=v.z<1&&!isTransitioning;m.el.style.transform='translate3d('+((v.x*.5+.5)*window.innerWidth)+'px,'+((-v.y*.5+.5)*window.innerHeight)+'px,0) translate(-50%,-50%) scale('+(m.scale||1)+')';m.el.style.opacity=visible?'1':'0';m.el.style.pointerEvents=visible?'auto':'none';m.el.style.zIndex=String(Math.round((1-v.z)*1000)+5)})}else{markerModels.forEach(function(m){m.el.style.opacity='0';m.el.style.pointerEvents='none'})}renderer.render(scene3d,camera)}
function campusSvg(){return '<svg class="simple-map" viewBox="0 0 1000 560"><rect width="1000" height="560" rx="26" fill="#eef6ff"/><path d="M88 94 H914 V472 H146 L90 112 Z" fill="#fff" stroke="#c9dcf4" stroke-width="4"/><path d="M155 138 V420 H880 V170" fill="none" stroke="#9fc3ec" stroke-width="24" stroke-linecap="round"/><path d="M362 214 H650 M404 304 H874 M410 390 H884" fill="none" stroke="#9fc3ec" stroke-width="16" stroke-linecap="round"/><circle cx="520" cy="280" r="62" fill="#d8eaff" stroke="#7db0ea" stroke-width="14"/><circle cx="520" cy="280" r="35" fill="#2f7fdf"/><g fill="#d8eaff" stroke="#7db0ea" stroke-width="4"><rect x="280" y="92" width="178" height="88" rx="12"/><rect x="282" y="252" width="112" height="134" rx="12"/><rect x="444" y="342" width="168" height="78" rx="12"/><rect x="674" y="342" width="218" height="78" rx="12"/><rect x="620" y="92" width="252" height="84" rx="12"/><rect x="808" y="176" width="72" height="132" rx="12"/></g></svg>'}
function floorSvg(){let room='';for(let i=0;i<15;i++){const x=116+i*50;if(x<870)room+='<rect x="'+x+'" y="116" width="42" height="96" rx="8" fill="#f9fcff" stroke="#c9dcf4" stroke-width="2"/><rect x="'+x+'" y="324" width="42" height="96" rx="8" fill="#f9fcff" stroke="#c9dcf4" stroke-width="2"/>'}return '<svg class="simple-map" viewBox="0 0 1000 560"><rect width="1000" height="560" rx="26" fill="#eef6ff"/><rect x="62" y="82" width="876" height="380" rx="18" fill="#fff" stroke="#c9dcf4" stroke-width="4"/><rect x="110" y="250" width="780" height="56" rx="14" fill="#d8eaff"/>'+room+'<path d="M116 278 H884" stroke="#2f7fdf" stroke-width="4" stroke-dasharray="10 10"/></svg>'}
applySceneUi();document.body.classList.add('is-cinematic');showIntroPlaceholder(activeScene);planetCanvas.classList.add('show');setPlanetIntroStyle(1,1,0);setMotion(true,'正在进入校园中');loadTexture(activeScene.imageUrl);loadIntroPlanet(activeScene).then(runIntro);animate();
</script>
</body>
</html>`;
}

function createPreviewHtml(projectExpression) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>泰安中公学习基地360全景浏览</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:"Microsoft YaHei",system-ui,sans-serif;background:#eef6ff;color:#102033}.tour{display:grid;grid-template-columns:292px minmax(0,1fr) 360px;min-height:100vh}.nav{background:#0b3f8a;color:#fff;padding:18px;overflow:auto}.brand{font-size:22px;font-weight:900;line-height:1.25;margin-bottom:18px}.brand small{display:block;margin-top:6px;font-size:12px;font-weight:600;opacity:.82}.group{margin:16px 0}.group-title{font-weight:900;margin-bottom:8px}.floor-title{font-size:12px;opacity:.78;margin:10px 0 6px}.scene-btn{display:block;width:100%;padding:10px 12px;margin:5px 0;border:1px solid rgba(255,255,255,.18);border-radius:8px;color:#fff;background:rgba(255,255,255,.08);text-align:left;cursor:pointer}.scene-btn.active{background:#fff;color:#0b3f8a}.stage{display:grid;grid-template-rows:1fr auto;min-width:0}.viewer{position:relative;min-height:620px;overflow:hidden;background:#111;cursor:grab}.pano{position:absolute;inset:0;background-size:auto 100%;background-repeat:repeat-x;background-position:center center}.hotspot{position:absolute;top:50%;transform:translate(-50%,-50%);padding:8px 12px 8px 28px;border:1px solid rgba(255,255,255,.86);border-radius:999px;background:rgba(255,255,255,.94);color:#0b3f8a;font-size:12px;font-weight:900;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.28)}.hotspot:before{content:"";position:absolute;left:10px;top:50%;width:9px;height:9px;border-radius:99px;background:#2f7fdf;transform:translateY(-50%);box-shadow:0 0 0 5px rgba(47,127,223,.18)}.info{position:absolute;left:24px;bottom:24px;max-width:560px;padding:16px 18px;border-radius:8px;background:rgba(7,32,69,.78);color:#fff;backdrop-filter:blur(10px)}.info h1{margin:0 0 8px;font-size:24px}.info p{margin:0;line-height:1.7;font-size:14px}.video-btn{margin-top:12px;min-height:38px;padding:0 14px;border:0;border-radius:7px;background:#2f7fdf;color:#fff;font-weight:800;cursor:pointer}.map-panel{background:#fff;border-left:1px solid #c9dcf4;padding:16px;overflow:auto}.map-panel h2{margin:0 0 12px;font-size:16px}.map-card{position:relative}.simple-map{width:100%;height:260px;border:1px solid #c9dcf4;border-radius:8px;background:#eef6ff}.floor-marker{position:absolute;transform:translate(-50%,-50%);width:32px;height:32px;border:2px solid #fff;border-radius:99px;background:#2f7fdf;color:#fff;font-weight:900;box-shadow:0 8px 18px rgba(13,63,138,.2)}.scene-list{margin-top:14px}.scene-list button{display:block;width:100%;margin-bottom:7px;padding:10px;border:1px solid #d8e7f8;border-radius:7px;background:#fff;text-align:left;cursor:pointer;color:#102033}.scene-list button.active{border-color:#2f7fdf;background:#edf6ff;color:#0b3f8a;font-weight:900}.video-modal{position:fixed;inset:0;z-index:50;display:none;background:rgba(5,18,38,.92);align-items:center;justify-content:center;padding:28px}.video-modal.is-open{display:flex}.video-modal button{position:absolute;right:24px;top:24px;min-height:40px;padding:0 14px;border:0;border-radius:7px;background:#fff;color:#0b3f8a;font-weight:900}.video-frame{width:min(1120px,94vw);height:min(680px,72vh);border:0;border-radius:8px;background:#000}@media(max-width:1100px){.tour{grid-template-columns:1fr}.nav{max-height:330px}.map-panel{border-left:0}.viewer{min-height:520px}}
.stage{grid-template-rows:1fr}.video-modal{background:rgba(6,20,45,.48);backdrop-filter:blur(18px)}.video-modal button{border:1px solid rgba(255,255,255,.36);background:rgba(255,255,255,.78);backdrop-filter:blur(14px)}.video-frame{border:1px solid rgba(255,255,255,.34);border-radius:14px;background:rgba(255,255,255,.12);box-shadow:0 28px 90px rgba(0,0,0,.42);backdrop-filter:blur(18px)}
</style>
</head>
<body>
<div class="tour">
  <aside class="nav"><div class="brand">泰安中公学习基地<small>360全景浏览</small></div><div id="nav"></div></aside>
  <main class="stage">
    <section class="viewer" id="viewer"><div class="pano" id="pano"></div><div id="hotspots"></div><div class="info"><h1 id="title"></h1><p id="desc"></p><button class="video-btn" id="videoBtn">全屏播放视频</button></div></section>
  </main>
  <aside class="map-panel"><h2 id="mapTitle"></h2><div class="map-card" id="mapCard"></div><div class="scene-list" id="sceneList"></div></aside>
</div>
<div class="video-modal" id="videoModal"><button id="closeVideo">关闭</button><div id="videoMount"></div></div>
<script>
const fallbackProject=${projectExpression};
async function loadProjectData(){try{const response=await fetch(new URL('../data/project.json',import.meta.url),{cache:'no-store'});if(response.ok){const data=await response.json();if(data&&Array.isArray(data.scenes)&&data.scenes.length)return data}}catch(error){console.warn(error)}return fallbackProject}
const project=await loadProjectData();
const OPENING_SCENE_ID='outdoor-gate';
let activeScene=project.scenes.find(s=>s.id===OPENING_SCENE_ID)||project.scenes[0];project.activeSceneId=activeScene?.id||project.activeSceneId;
let lon=0, zoom=1, dragging=false, startX=0, startLon=0;
const viewer=document.getElementById('viewer'), pano=document.getElementById('pano');
function floorOf(scene){for(const g of project.groups){const f=g.floors.find(x=>x.id===scene.floorId);if(f)return {...f,groupName:g.name}}return null}
function esc(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function renderNav(){document.getElementById('nav').innerHTML=project.groups.map(g=>'<div class="group"><div class="group-title">'+esc(g.name)+'</div>'+g.floors.map(f=>'<div><div class="floor-title">'+esc(f.name)+'</div>'+project.scenes.filter(s=>s.floorId===f.id).map(s=>'<button class="scene-btn '+(s.id===activeScene.id?'active':'')+'" data-scene-id="'+esc(s.id)+'">'+esc(s.name)+'</button>').join('')+'</div>').join('')+'</div>').join('');document.querySelectorAll('#nav [data-scene-id]').forEach(btn=>btn.onclick=()=>setScene(btn.dataset.sceneId))}
function setScene(id){activeScene=project.scenes.find(s=>s.id===id)||activeScene;lon=0;zoom=1;render()}
function render(){document.getElementById('title').textContent=activeScene.name;document.getElementById('desc').textContent=activeScene.description||'';pano.style.backgroundImage='url('+activeScene.imageUrl+')';document.getElementById('videoBtn').style.display=activeScene.videoUrl?'inline-flex':'none';renderNav();renderHotspots();renderMap();updatePano()}
function renderHotspots(){const root=document.getElementById('hotspots');root.innerHTML='';(activeScene.hotspots||[]).forEach(h=>{const b=document.createElement('button');b.className='hotspot';b.textContent=h.label;b.style.left=((h.yaw+180)/360*100)+'%';b.onclick=(event)=>{event.stopPropagation(); if(h.targetSceneId)setScene(h.targetSceneId)};root.appendChild(b)})}
function renderMap(){const floor=floorOf(activeScene);document.getElementById('mapTitle').textContent=(floor?.groupName||'地图')+' / '+(floor?.name||'');const card=document.getElementById('mapCard');const same=project.scenes.filter(s=>s.floorId===activeScene.floorId);card.innerHTML=(floor?.mapType==='campus'?campusSvg():floorSvg(floor))+'<button class="floor-marker" style="left:'+(floor?.mapType==='campus'?activeScene.campusPosition.x:activeScene.mapPosition.x)+'%;top:'+(floor?.mapType==='campus'?activeScene.campusPosition.y:activeScene.mapPosition.y)+'%">●</button>';document.getElementById('sceneList').innerHTML=same.map(s=>'<button class="'+(s.id===activeScene.id?'active':'')+'" data-scene-id="'+esc(s.id)+'">'+esc(s.name)+'</button>').join('');document.querySelectorAll('#sceneList [data-scene-id]').forEach(btn=>btn.onclick=()=>setScene(btn.dataset.sceneId))}
function updatePano(){pano.style.backgroundSize=(100*zoom)+'% 100%';pano.style.backgroundPosition=lon+'px center'}
viewer.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX;startLon=lon;viewer.setPointerCapture(e.pointerId)});
viewer.addEventListener('pointermove',e=>{if(!dragging)return;lon=startLon+(e.clientX-startX);updatePano()});
viewer.addEventListener('pointerup',()=>dragging=false);
viewer.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(1,Math.min(2.4,zoom+(e.deltaY<0?.08:-.08)));updatePano()},{passive:false});
document.getElementById('videoBtn').onclick=()=>openVideo(activeScene.videoUrl);
document.getElementById('closeVideo').onclick=closeVideo;
function openVideo(url){const modal=document.getElementById('videoModal');const mount=document.getElementById('videoMount');const isMp4=/\\.(mp4|webm|ogg)(\\?|#|$)/i.test(url);mount.innerHTML=isMp4?'<video class="video-frame" src="'+esc(url)+'" controls autoplay></video>':'<iframe class="video-frame" src="'+esc(url)+'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>';modal.classList.add('is-open')}
function closeVideo(){const modal=document.getElementById('videoModal');modal.classList.remove('is-open');document.getElementById('videoMount').innerHTML=''}
function campusSvg(){return '<svg class="simple-map" viewBox="0 0 1000 560"><rect width="1000" height="560" rx="26" fill="#eef6ff"/><path d="M88 94 H914 V472 H146 L90 112 Z" fill="#fff" stroke="#c9dcf4" stroke-width="4"/><path d="M155 138 V420 H880 V170" fill="none" stroke="#9fc3ec" stroke-width="24" stroke-linecap="round"/><path d="M362 214 H650 M404 304 H874 M410 390 H884" fill="none" stroke="#9fc3ec" stroke-width="16" stroke-linecap="round"/><circle cx="520" cy="280" r="62" fill="#d8eaff" stroke="#7db0ea" stroke-width="14"/><circle cx="520" cy="280" r="35" fill="#2f7fdf"/><g fill="#d8eaff" stroke="#7db0ea" stroke-width="4"><rect x="280" y="92" width="178" height="88" rx="12"/><rect x="282" y="252" width="112" height="134" rx="12"/><rect x="444" y="342" width="168" height="78" rx="12"/><rect x="674" y="342" width="218" height="78" rx="12"/><rect x="620" y="92" width="252" height="84" rx="12"/><rect x="808" y="176" width="72" height="132" rx="12"/></g></svg>'}
function floorSvg(floor){let room='';for(let i=0;i<15;i++){const x=116+i*50;if(x<870)room+='<rect x="'+x+'" y="116" width="42" height="96" rx="8" fill="#f9fcff" stroke="#c9dcf4" stroke-width="2"/><rect x="'+x+'" y="324" width="42" height="96" rx="8" fill="#f9fcff" stroke="#c9dcf4" stroke-width="2"/>'}return '<svg class="simple-map" viewBox="0 0 1000 560"><rect width="1000" height="560" rx="26" fill="#eef6ff"/><rect x="62" y="82" width="876" height="380" rx="18" fill="#fff" stroke="#c9dcf4" stroke-width="4"/><rect x="110" y="250" width="780" height="56" rx="14" fill="#d8eaff"/>'+room+'<path d="M116 278 H884" stroke="#2f7fdf" stroke-width="4" stroke-dasharray="10 10"/></svg>'}
render();
</script>
</body>
</html>`;
}

export default App;



