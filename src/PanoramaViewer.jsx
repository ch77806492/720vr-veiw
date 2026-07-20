import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { createAnimatedTexture } from './animatedTexture.js';

export default function PanoramaViewer({
  imageUrl,
  krpanoTiles,
  hotspots,
  videoSpots = [],
  animatedSpots = [],
  activeHotspotId,
  activeVideoId,
  editMode = false,
  onSelectHotspot,
  onMoveHotspot,
  onSelectVideo,
  onMoveVideo,
  activeAnimatedSpotId,
  onSelectAnimatedSpot,
  onMoveAnimatedSpot,
  onViewChange,
  initialYaw = -24,
  initialPitch = 1,
  imageRoll = 0,
}) {
  const mountRef = useRef(null);
  const sphereRef = useRef(null);
  const tileGroupRef = useRef(null);
  const tileMaterialsRef = useRef([]);
  const markersRef = useRef([]);
  const animatedGroupRef = useRef(null);
  const animatedMeshesRef = useRef([]);
  const animatedGuideMeshesRef = useRef([]);
  const animatedControllersRef = useRef([]);
  const editModeRef = useRef(editMode);
  const callbacksRef = useRef({ onSelectHotspot, onMoveHotspot, onSelectVideo, onMoveVideo, onSelectAnimatedSpot, onMoveAnimatedSpot, onViewChange });
  const dragRef = useRef({
    panoramaActive: false,
    hotspotActive: false,
    markerType: null,
    markerId: null,
    x: 0,
    y: 0,
    lon: initialYaw,
    lat: initialPitch,
    targetLon: initialYaw,
    targetLat: initialPitch,
    yaw: 0,
    pitch: 0,
  });

  callbacksRef.current = { onSelectHotspot, onMoveHotspot, onSelectVideo, onMoveVideo, onSelectAnimatedSpot, onMoveAnimatedSpot, onViewChange };
  editModeRef.current = editMode;

  useEffect(() => {
    dragRef.current.lon = initialYaw;
    dragRef.current.targetLon = initialYaw;
    dragRef.current.lat = initialPitch;
    dragRef.current.targetLat = initialPitch;
    callbacksRef.current.onViewChange?.({ yaw: initialYaw, pitch: initialPitch });
  }, [imageUrl, initialYaw, initialPitch]);

  useEffect(() => {
    if (!sphereRef.current) return;
    sphereRef.current.rotation.y = THREE.MathUtils.degToRad(Number(imageRoll) || 0);
    sphereRef.current.rotation.z = 0;
  }, [imageRoll]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 1200);
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 72, 48);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x2d2d2d });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.y = THREE.MathUtils.degToRad(Number(imageRoll) || 0);
    scene.add(sphere);
    sphereRef.current = sphere;

    const tileGroup = new THREE.Group();
    tileGroup.visible = false;
    scene.add(tileGroup);
    tileGroupRef.current = tileGroup;

    const animatedGroup = new THREE.Group();
    scene.add(animatedGroup);
    animatedGroupRef.current = animatedGroup;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event) => {
      if (dragRef.current.hotspotActive) return;
      if (editModeRef.current && animatedMeshesRef.current.length) {
        const rect = mount.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(animatedMeshesRef.current, false)[0];
        if (hit?.object?.userData?.spot) {
          const spot = hit.object.userData.spot;
          callbacksRef.current.onSelectAnimatedSpot?.(spot.id);
          dragRef.current.hotspotActive = true;
          dragRef.current.markerType = 'animated';
          dragRef.current.markerId = spot.id;
          dragRef.current.x = event.clientX;
          dragRef.current.y = event.clientY;
          dragRef.current.yaw = Number(spot.yaw) || 0;
          dragRef.current.pitch = Number(spot.pitch) || 0;
          mount.setPointerCapture?.(event.pointerId);
          return;
        }
      }
      dragRef.current.panoramaActive = true;
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
      mount.setPointerCapture?.(event.pointerId);
    };

    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (drag.hotspotActive) {
        const deltaX = event.clientX - drag.x;
        const deltaY = event.clientY - drag.y;
        const nextPosition = {
          yaw: THREE.MathUtils.clamp(drag.yaw + deltaX * 0.32, -180, 180),
          pitch: THREE.MathUtils.clamp(drag.pitch - deltaY * 0.24, -65, 65),
        };
        if (drag.markerType === 'video') {
          callbacksRef.current.onMoveVideo?.(drag.markerId, nextPosition);
        } else if (drag.markerType === 'animated') {
          callbacksRef.current.onMoveAnimatedSpot?.(drag.markerId, nextPosition);
        } else {
          callbacksRef.current.onMoveHotspot?.(drag.markerId, nextPosition);
        }
        return;
      }
      if (!drag.panoramaActive) return;
      const deltaX = event.clientX - drag.x;
      const deltaY = event.clientY - drag.y;
      drag.targetLon += deltaX * 0.12;
      drag.targetLat += deltaY * 0.12;
      drag.x = event.clientX;
      drag.y = event.clientY;
    };

    const onPointerUp = () => {
      if (dragRef.current.panoramaActive) {
        callbacksRef.current.onViewChange?.({
          yaw: dragRef.current.targetLon,
          pitch: dragRef.current.targetLat,
        });
      }
      dragRef.current.panoramaActive = false;
      dragRef.current.hotspotActive = false;
      dragRef.current.markerType = null;
      dragRef.current.markerId = null;
    };

    const onWheel = (event) => {
      camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.03, 38, 88);
      camera.updateProjectionMatrix();
    };

    const onResize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    mount.addEventListener('wheel', onWheel, { passive: true });
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);
    window.addEventListener('resize', onResize);
    onResize();

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const drag = dragRef.current;
      drag.lon += (drag.targetLon - drag.lon) * 0.08;
      drag.lat += (drag.targetLat - drag.lat) * 0.08;
      drag.lat = Math.max(-78, Math.min(78, drag.lat));

      const phi = THREE.MathUtils.degToRad(90 - drag.lat);
      const theta = THREE.MathUtils.degToRad(drag.lon);
      camera.lookAt(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta),
      );

      markersRef.current.forEach((marker) => {
        const vector = marker.position.clone().project(camera);
        const visible = vector.z < 1;
        marker.el.style.transform = `translate3d(${(vector.x * 0.5 + 0.5) * mount.clientWidth}px, ${(-vector.y * 0.5 + 0.5) * mount.clientHeight}px, 0) scale(${marker.scale})`;
        marker.el.style.opacity = visible ? '1' : '0';
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      tileMaterialsRef.current.forEach((tileMaterial) => {
        tileMaterial.map?.dispose();
        tileMaterial.dispose();
      });
      tileMaterialsRef.current = [];
      tileGroup.clear();
      animatedControllersRef.current.forEach((controller) => controller.dispose());
      animatedControllersRef.current = [];
      animatedMeshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      animatedMeshesRef.current = [];
      animatedGuideMeshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      animatedGuideMeshesRef.current = [];
      animatedGroup.clear();
      geometry.dispose();
      material.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const disposeTiles = () => {
    const tileGroup = tileGroupRef.current;
    if (!tileGroup) return;
    tileGroup.clear();
    tileMaterialsRef.current.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    tileMaterialsRef.current = [];
  };

  const tilePatternUrl = (tiles, face, row, col) =>
    String(tiles?.pattern || '')
      .replaceAll('{face}', face)
      .replaceAll('{level}', String(tiles?.level || 1))
      .replaceAll('{row}', String(row))
      .replaceAll('{col}', String(col));

  const makeTileMesh = (face, row, col, grid, material) => {
    const size = 1000 / grid;
    const half = 500;
    const x = -half + size * (col - 0.5);
    const y = half - size * (row - 0.5);
    const geo = new THREE.PlaneGeometry(size + 0.6, size + 0.6);
    const mesh = new THREE.Mesh(geo, material);
    if (face === 'f') mesh.position.set(x, y, -half);
    if (face === 'b') {
      mesh.position.set(-x, y, half);
      mesh.rotation.y = Math.PI;
    }
    if (face === 'r') {
      mesh.position.set(half, y, x);
      mesh.rotation.y = -Math.PI / 2;
    }
    if (face === 'l') {
      mesh.position.set(-half, y, -x);
      mesh.rotation.y = Math.PI / 2;
    }
    if (face === 'u') {
      mesh.position.set(x, half, y);
      mesh.rotation.x = Math.PI / 2;
    }
    if (face === 'd') {
      mesh.position.set(x, -half, -y);
      mesh.rotation.x = -Math.PI / 2;
    }
    return mesh;
  };

  useEffect(() => {
    if (!sphereRef.current) return;
    const loader = new THREE.TextureLoader();

    if (krpanoTiles?.pattern) {
      let cancelled = false;
      const tileGroup = tileGroupRef.current;
      disposeTiles();
      tileGroup.visible = false;
      sphereRef.current.visible = false;
      const faces = ['f', 'r', 'b', 'l', 'u', 'd'];
      const grid = Math.max(1, Number(krpanoTiles.grid) || 1);
      const loadTile = (url) =>
        new Promise((resolve) => {
          loader.load(
            url,
            (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              resolve(texture);
            },
            undefined,
            () => resolve(null),
          );
        });
      Promise.all(
        faces.flatMap((face) =>
          Array.from({ length: grid }, (_, rowIndex) =>
            Array.from({ length: grid }, (_, colIndex) => {
              const row = rowIndex + 1;
              const col = colIndex + 1;
              return loadTile(tilePatternUrl(krpanoTiles, face, row, col)).then((texture) => {
                if (!texture || cancelled) return;
                const material = new THREE.MeshBasicMaterial({
                  map: texture,
                  transparent: true,
                  opacity: 1,
                  side: THREE.DoubleSide,
                });
                tileMaterialsRef.current.push(material);
                tileGroup.add(makeTileMesh(face, row, col, grid, material));
              });
            }),
          ).flat(),
        ),
      ).then(() => {
        if (cancelled) return;
        tileGroup.rotation.y = THREE.MathUtils.degToRad(Number(imageRoll) || 0);
        tileGroup.visible = tileGroup.children.length > 0;
        sphereRef.current.visible = tileGroup.children.length === 0;
        if (tileGroup.children.length === 0) {
          sphereRef.current.material = new THREE.MeshBasicMaterial({ color: 0x3a2020 });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    disposeTiles();
    tileGroupRef.current.visible = false;
    sphereRef.current.visible = true;

    loader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const oldMaterial = sphereRef.current.material;
        sphereRef.current.material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 1 });
        oldMaterial.dispose();
        gsap.fromTo(sphereRef.current.material, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
      },
      undefined,
      () => {
        sphereRef.current.material = new THREE.MeshBasicMaterial({ color: 0x3a2020 });
      },
    );
  }, [imageUrl, krpanoTiles, imageRoll]);

  useEffect(() => {
    const group = animatedGroupRef.current;
    if (!group) return undefined;
    let cancelled = false;

    animatedControllersRef.current.forEach((controller) => controller.dispose());
    animatedControllersRef.current = [];
    animatedMeshesRef.current.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    animatedMeshesRef.current = [];
    animatedGuideMeshesRef.current.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    animatedGuideMeshesRef.current = [];
    group.clear();

    const placeMesh = (mesh, spot, aspect = 1) => {
      const yaw = Number(spot.yaw) || 0;
      const pitch = THREE.MathUtils.clamp(Number(spot.pitch) || 0, -75, 75);
      const phi = THREE.MathUtils.degToRad(90 - pitch);
      const theta = THREE.MathUtils.degToRad(yaw);
      const radius = 475;
      mesh.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
      mesh.lookAt(0, 0, 0);
      mesh.rotateZ(THREE.MathUtils.degToRad(Number(spot.rotation) || 0));
      const width = 90 * THREE.MathUtils.clamp((Number(spot.size) || 100) / 100, 0.1, 3);
      mesh.scale.set(width, width / Math.max(0.1, aspect), 1);
    };

    animatedSpots.filter((spot) => spot.imageUrl).forEach((spot) => {
      const material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      mesh.renderOrder = 12;
      mesh.userData.spot = spot;
      placeMesh(mesh, spot);
      group.add(mesh);
      animatedMeshesRef.current.push(mesh);

      let guide = null;
      if (editMode) {
        guide = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({
            color: 0xff2638,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false,
          }),
        );
        guide.renderOrder = 11;
        placeMesh(guide, spot);
        group.add(guide);
        animatedGuideMeshesRef.current.push(guide);
      }

      createAnimatedTexture(spot.imageUrl, {
        playCount: spot.playCount,
        onReady: (aspect) => {
          placeMesh(mesh, spot, aspect);
          if (guide) placeMesh(guide, spot, aspect);
        },
      }).then((controller) => {
        if (cancelled || !group.children.includes(mesh)) {
          controller.dispose();
          return;
        }
        animatedControllersRef.current.push(controller);
        material.map = controller.texture;
        material.opacity = 1;
        material.needsUpdate = true;
      });
    });

    return () => {
      cancelled = true;
      animatedControllersRef.current.forEach((controller) => controller.dispose());
      animatedControllersRef.current = [];
      animatedMeshesRef.current.forEach((mesh) => {
        group.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      animatedMeshesRef.current = [];
      animatedGuideMeshesRef.current.forEach((mesh) => {
        group.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      animatedGuideMeshesRef.current = [];
    };
  }, [animatedSpots, editMode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    markersRef.current.forEach((marker) => marker.el.remove());

    const markers = [
      ...hotspots.map((hotspot) => ({ ...hotspot, markerType: 'hotspot' })),
      ...videoSpots.map((video) => ({ ...video, markerType: 'video' })),
    ];

    markersRef.current = markers.map((marker) => {
      const el = document.createElement('button');
      const isActive = marker.markerType === 'video'
        ? marker.id === activeVideoId
        : marker.id === activeHotspotId;
      const videoStyle =
        marker.markerType === 'video' && marker.displayStyle === 'small' ? 'is-small' : 'is-large';
      el.className = `viewer-hotspot ${marker.markerType === 'video' ? `is-video ${videoStyle}` : ''} ${isActive ? 'is-active' : ''} ${editMode ? 'is-editable' : ''}`;
      el.type = 'button';
      const label = document.createElement('span');
      label.textContent = marker.label || '';
      el.appendChild(label);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        if (marker.markerType === 'video') {
          callbacksRef.current.onSelectVideo?.(marker.id);
        } else {
          callbacksRef.current.onSelectHotspot?.(marker.id);
        }
      });
      el.addEventListener('pointerdown', (event) => {
        if (!editMode) return;
        event.stopPropagation();
        if (marker.markerType === 'video') {
          callbacksRef.current.onSelectVideo?.(marker.id);
        } else {
          callbacksRef.current.onSelectHotspot?.(marker.id);
        }
        dragRef.current.hotspotActive = true;
        dragRef.current.markerType = marker.markerType;
        dragRef.current.markerId = marker.id;
        dragRef.current.x = event.clientX;
        dragRef.current.y = event.clientY;
        dragRef.current.yaw = marker.yaw;
        dragRef.current.pitch = marker.pitch || 0;
        mount.setPointerCapture?.(event.pointerId);
      });
      mount.appendChild(el);

      const phi = THREE.MathUtils.degToRad(90 - (marker.pitch || 0));
      const theta = THREE.MathUtils.degToRad(marker.yaw);
      const position = new THREE.Vector3(
        490 * Math.sin(phi) * Math.cos(theta),
        490 * Math.cos(phi),
        490 * Math.sin(phi) * Math.sin(theta),
      );

      const minScale = marker.markerType === 'hotspot' ? 0.7 : 0.1;
      const maxScale = 1.8;
      const scale = Math.max(minScale, Math.min(maxScale, (Number(marker.size) || 100) / 100));
      return { id: marker.id, markerType: marker.markerType, el, position, scale };
    });

    gsap.fromTo('.viewer-hotspot', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.22, stagger: 0.03 });

    return () => {
      markersRef.current.forEach((marker) => marker.el.remove());
      markersRef.current = [];
    };
  }, [hotspots, videoSpots, activeHotspotId, activeVideoId, editMode]);

  return <div ref={mountRef} className="panorama-mount" aria-label="360全景浏览器" />;
}
