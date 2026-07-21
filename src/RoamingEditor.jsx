import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Crosshair, FileAudio, Film, ImagePlus, Images, Music2, Pause, Play, Plus, Route, Save, Trash2, Upload } from 'lucide-react';
import PanoramaViewer from './PanoramaViewer.jsx';
import { GUIDE_ACTIONS, createGuideClip, createImageClip, createNarrationClip, createRoamingRoute, createRoamingStop, fovToZoom, zoomToFov } from './roamingConfig.js';
import './RoamingEditor.css';
import './RoamingEditorTimeline.css';
import './RoamingEditorGuide.css';
import './RoamingEditorMedia.css';

export default function RoamingEditor({ config, scenes, onChange, onBack, onSave, onUploadMusic, onUploadGuide, onUploadNarration, onUploadImage, isSaving }) {
  const activeRoute = config.routes.find((route) => route.id === config.activeRouteId) || config.routes[0];
  const [selectedStopId, setSelectedStopId] = useState(activeRoute?.stops?.[0]?.id || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [draftView, setDraftView] = useState({ yaw: -24, pitch: 1, fov: 70 });
  const [keyframeTime, setKeyframeTime] = useState(0);
  const [selectedGuideClipId, setSelectedGuideClipId] = useState('');
  const [selectedNarrationClipId, setSelectedNarrationClipId] = useState('');
  const [selectedImageClipId, setSelectedImageClipId] = useState('');
  const playbackStartedAtRef = useRef(0);
  const playbackOffsetRef = useRef(0);
  const narrationAudioRef = useRef(null);
  const selectedStop = activeRoute?.stops.find((stop) => stop.id === selectedStopId) || activeRoute?.stops?.[0];
  const selectedScene = scenes.find((scene) => scene.id === selectedStop?.sceneId) || scenes[0];
  const routeDuration = useMemo(
    () => (activeRoute?.stops || []).reduce((total, stop) => total + Number(stop.duration || 0), 0),
    [activeRoute],
  );
  const playback = useMemo(() => locatePlayback(activeRoute, playhead), [activeRoute, playhead]);
  const previewStop = isPlaying ? playback.stop || selectedStop : selectedStop;
  const previewScene = scenes.find((scene) => scene.id === previewStop?.sceneId) || selectedScene;
  const previewView = useMemo(
    () => interpolateCamera(previewStop, isPlaying ? playback.localTime : null, draftView),
    [previewStop, isPlaying, playback.localTime, draftView],
  );
  const selectedGuideClip = selectedStop?.guideClips.find((clip) => clip.id === selectedGuideClipId);
  const selectedNarrationClip = selectedStop?.narrationClips.find((clip) => clip.id === selectedNarrationClipId);
  const selectedImageClip = selectedStop?.imageClips.find((clip) => clip.id === selectedImageClipId);
  const previewGuideClip = isPlaying
    ? previewStop?.guideClips.find((clip) => playback.localTime >= clip.start && playback.localTime <= clip.start + clip.duration)
    : selectedGuideClip;
  const guideAction = previewGuideClip?.action || 'idle';
  const guideAsset = config.guide.assets[guideAction]?.url || config.guide.assets.idle?.url || '';
  const guidePlacement = interpolateGuidePlacement(previewGuideClip, isPlaying ? playback.localTime : null);
  const previewNarrationClip = isPlaying
    ? previewStop?.narrationClips.find((clip) => playback.localTime >= clip.start && playback.localTime <= clip.start + clip.duration)
    : null;
  const previewImageClip = isPlaying
    ? previewStop?.imageClips.find((clip) => playback.localTime >= clip.start && playback.localTime <= clip.start + clip.duration)
    : selectedImageClip;

  useEffect(() => {
    if (!narrationAudioRef.current) narrationAudioRef.current = new Audio();
    const audio = narrationAudioRef.current;
    if (!isPlaying || !previewNarrationClip?.url) {
      audio.pause();
      return;
    }
    if (audio.src !== new URL(previewNarrationClip.url, window.location.href).href) audio.src = previewNarrationClip.url;
    audio.currentTime = Math.max(0, (Number(previewNarrationClip.trimStart) || 0) + playback.localTime - previewNarrationClip.start);
    audio.play().catch(() => {});
  }, [isPlaying, previewNarrationClip?.id, previewNarrationClip?.url, previewNarrationClip?.trimStart]);

  useEffect(() => () => narrationAudioRef.current?.pause(), []);

  useEffect(() => {
    if (!isPlaying || routeDuration <= 0) return undefined;
    playbackStartedAtRef.current = performance.now();
    playbackOffsetRef.current = playhead;
    let frameId;
    const tick = (now) => {
      const next = playbackOffsetRef.current + (now - playbackStartedAtRef.current) / 1000;
      if (next >= routeDuration) {
        setPlayhead(routeDuration);
        setIsPlaying(false);
        return;
      }
      setPlayhead(next);
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, routeDuration]);

  useEffect(() => {
    if (!isPlaying || !playback.stop || playback.stop.id === selectedStopId) return;
    setSelectedStopId(playback.stop.id);
  }, [isPlaying, playback.stop, selectedStopId]);

  useEffect(() => {
    if (!isPlaying || !playback.stop || playback.stop.id !== selectedStopId) return;
    setKeyframeTime(Number(playback.localTime.toFixed(1)));
  }, [isPlaying, playback.stop, playback.localTime, selectedStopId]);

  const patchConfig = (patch) => onChange({ ...config, ...patch, enabled: true });
  const patchRoute = (routeId, patch) => {
    patchConfig({ routes: config.routes.map((route) => (route.id === routeId ? { ...route, ...patch } : route)) });
  };
  const selectRoute = (routeId) => {
    const route = config.routes.find((item) => item.id === routeId);
    patchConfig({ activeRouteId: routeId });
    setSelectedStopId(route?.stops?.[0]?.id || '');
  };
  const addRoute = () => {
    const route = createRoamingRoute(config.routes.length + 1);
    patchConfig({ routes: [...config.routes, route], activeRouteId: route.id });
    setSelectedStopId('');
  };
  const deleteRoute = () => {
    if (config.routes.length <= 1) return;
    const routes = config.routes.filter((route) => route.id !== activeRoute.id);
    patchConfig({ routes, activeRouteId: routes[0].id });
    setSelectedStopId(routes[0].stops?.[0]?.id || '');
  };
  const addScene = (scene) => {
    const stop = createRoamingStop(scene, activeRoute.stops.length);
    patchRoute(activeRoute.id, { stops: [...activeRoute.stops, stop] });
    setSelectedStopId(stop.id);
  };
  const removeStop = (stopId) => {
    const stops = activeRoute.stops.filter((stop) => stop.id !== stopId);
    patchRoute(activeRoute.id, { stops });
    setSelectedStopId(stops[0]?.id || '');
  };
  const patchStop = (stopId, patch) => {
    patchRoute(activeRoute.id, {
      stops: activeRoute.stops.map((stop) => (stop.id === stopId ? { ...stop, ...patch } : stop)),
    });
  };
  const addCameraKeyframe = () => {
    if (!selectedStop) return;
    const currentTime = isPlaying && playback.stop?.id === selectedStop.id ? playback.localTime : keyframeTime;
    const time = Number(Math.max(0, Math.min(selectedStop.duration, Number(currentTime) || 0)).toFixed(1));
    const keyframe = {
      id: `camera-${selectedStop.id}-${Date.now()}`,
      time,
      yaw: Number(draftView.yaw.toFixed(2)),
      pitch: Number(draftView.pitch.toFixed(2)),
      fov: Math.round(draftView.fov || 70),
      zoom: Math.round(fovToZoom(draftView.fov || 70)),
    };
    patchStop(selectedStop.id, {
      cameraKeyframes: [...selectedStop.cameraKeyframes, keyframe].sort((a, b) => a.time - b.time),
    });
    setIsPlaying(false);
    setKeyframeTime(time);
    setPlayhead(stopStartTime(activeRoute, selectedStop.id) + time);
  };
  const patchCameraKeyframe = (keyframeId, patch) => {
    patchStop(selectedStop.id, {
      cameraKeyframes: selectedStop.cameraKeyframes
        .map((keyframe) => (keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe))
        .sort((a, b) => a.time - b.time),
    });
  };
  const deleteCameraKeyframe = (keyframeId) => {
    if (selectedStop.cameraKeyframes.length <= 1) return;
    patchStop(selectedStop.id, {
      cameraKeyframes: selectedStop.cameraKeyframes.filter((keyframe) => keyframe.id !== keyframeId),
    });
  };
  const deleteGuideAsset = (action) => {
    patchConfig({
      guide: {
        ...config.guide,
        assets: {
          ...config.guide.assets,
          [action]: { action, name: '', url: '', assetFileName: '' },
        },
      },
    });
  };
  const addGuideAction = (action) => {
    if (!selectedStop) return;
    const clip = { ...createGuideClip(action), start: Math.min(Number(keyframeTime) || 0, selectedStop.duration) };
    patchStop(selectedStop.id, { guideClips: [...selectedStop.guideClips, clip] });
    setSelectedGuideClipId(clip.id);
    setSelectedNarrationClipId('');
    setSelectedImageClipId('');
  };
  const patchGuideClip = (clipId, patch) => {
    patchStop(selectedStop.id, {
      guideClips: selectedStop.guideClips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
    });
  };
  const deleteGuideClip = (clipId) => {
    patchStop(selectedStop.id, { guideClips: selectedStop.guideClips.filter((clip) => clip.id !== clipId) });
    setSelectedGuideClipId('');
  };
  const addNarration = async (file) => {
    if (!selectedStop || !file) return;
    const asset = await onUploadNarration(file);
    if (!asset) return;
    const clip = { ...createNarrationClip(asset), ...asset, start: Math.min(Number(keyframeTime) || 0, Math.max(0, selectedStop.duration - 0.5)) };
    patchStop(selectedStop.id, { narrationClips: [...selectedStop.narrationClips, clip] });
    setSelectedNarrationClipId(clip.id);
    setSelectedGuideClipId('');
    setSelectedImageClipId('');
  };
  const patchNarrationClip = (clipId, patch) => {
    patchStop(selectedStop.id, {
      narrationClips: selectedStop.narrationClips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
    });
  };
  const deleteNarrationClip = (clipId) => {
    patchStop(selectedStop.id, { narrationClips: selectedStop.narrationClips.filter((clip) => clip.id !== clipId) });
    setSelectedNarrationClipId('');
  };
  const addImage = async (file) => {
    if (!selectedStop || !file) return;
    const asset = await onUploadImage(file);
    if (!asset) return;
    const clip = { ...createImageClip(asset), ...asset, start: Math.min(Number(keyframeTime) || 0, Math.max(0, selectedStop.duration - 0.5)) };
    patchStop(selectedStop.id, { imageClips: [...selectedStop.imageClips, clip] });
    setSelectedImageClipId(clip.id);
    setSelectedGuideClipId('');
    setSelectedNarrationClipId('');
  };
  const patchImageClip = (clipId, patch) => {
    patchStop(selectedStop.id, {
      imageClips: selectedStop.imageClips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
    });
  };
  const deleteImageClip = (clipId) => {
    patchStop(selectedStop.id, { imageClips: selectedStop.imageClips.filter((clip) => clip.id !== clipId) });
    setSelectedImageClipId('');
  };
  const togglePlayback = () => {
    if (!routeDuration) return;
    if (!isPlaying && playhead >= routeDuration) setPlayhead(0);
    setIsPlaying((value) => !value);
  };

  return (
    <main className="roaming-editor-shell">
      <header className="roaming-toolbar">
        <div className="roaming-toolbar-start">
          <button className="roaming-icon-button" type="button" onClick={onBack} title="返回全景编辑">
            <ArrowLeft size={19} />
          </button>
          <div><span>自动漫游制作</span><strong>{activeRoute?.name || '未命名路线'}</strong></div>
        </div>
        <div className="roaming-route-tabs" role="tablist" aria-label="漫游路线">
          {config.routes.map((route, index) => (
            <button key={route.id} className={route.id === activeRoute.id ? 'is-active' : ''} type="button" onClick={() => selectRoute(route.id)}>
              路线{index + 1}
            </button>
          ))}
          <button className="roaming-add-tab" type="button" onClick={addRoute} title="添加路线"><Plus size={16} /></button>
        </div>
        <div className="roaming-toolbar-actions">
          <label className="roaming-music-button">
            <Music2 size={17} />
            <span>{config.music.url ? config.music.name || '已添加背景音乐' : '添加背景音乐'}</span>
            <input type="file" accept="audio/*" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadMusic(file);
              event.target.value = '';
            }} />
          </label>
          {config.music.url ? (
            <button className="roaming-icon-button" type="button" onClick={() => patchConfig({ music: { name: '', url: '', assetFileName: '' } })} title="删除背景音乐">
              <Trash2 size={17} />
            </button>
          ) : null}
          <button className="roaming-save-button" type="button" onClick={onSave} disabled={isSaving}>
            <Save size={17} />{isSaving ? '保存中' : '保存漫游'}
          </button>
        </div>
      </header>

      <section className="roaming-workbench">
        <aside className="roaming-library">
          <div className="roaming-section-heading"><div><Film size={17} /><strong>场景素材</strong></div><span>{scenes.length}</span></div>
          <div className="roaming-scene-list">
            {scenes.map((scene) => (
              <button type="button" key={scene.id} onClick={() => addScene(scene)}>
                <span style={{ backgroundImage: `url(${scene.thumbnailUrl || scene.imageUrl})` }} />
                <div><strong>{scene.name}</strong><small>添加到时间轴</small></div><Plus size={15} />
              </button>
            ))}
          </div>
        </aside>

        <section className="roaming-preview-area">
          <div className="roaming-preview-stage">
            {previewScene ? (
              <>
              <PanoramaViewer
                imageUrl={previewScene.imageUrl}
                krpanoTiles={previewScene.krpanoTiles}
                hotspots={[]}
                initialYaw={previewView.yaw ?? previewScene.initialYaw ?? -24}
                initialPitch={previewView.pitch ?? previewScene.initialPitch ?? 1}
                viewFov={previewView.fov || 70}
                controlledView={isPlaying}
                imageRoll={previewScene.imageRoll || 0}
                onViewChange={(view) => {
                  if (!isPlaying) setDraftView({ yaw: view.yaw, pitch: view.pitch, fov: view.fov || 70 });
                }}
              />
              {guideAsset ? (
                <img
                  className="roaming-guide-preview"
                  src={guideAsset}
                  alt=""
                  style={{
                    left: `${guidePlacement.x}%`,
                    top: `${guidePlacement.y}%`,
                    width: `${guidePlacement.size}%`,
                    transform: `translate(-50%,-50%) rotate(${guidePlacement.tilt}deg)`,
                  }}
                />
              ) : null}
              {previewImageClip?.url ? (
                <img
                  className="roaming-inserted-image-preview"
                  src={previewImageClip.url}
                  alt=""
                  style={{
                    left: `${previewImageClip.desktop.x}%`,
                    top: `${previewImageClip.desktop.y}%`,
                    width: `${previewImageClip.desktop.size}%`,
                  }}
                />
              ) : null}
              </>
            ) : (
              <div className="roaming-empty-preview"><Route size={32} /><span>从左侧添加场景开始制作路线</span></div>
            )}
          </div>
          <div className="roaming-transport">
            <button type="button" onClick={togglePlayback} title={isPlaying ? '暂停预览' : '播放预览'}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span>{formatDuration(playhead)} / {formatDuration(routeDuration)}</span>
            <div
              className="roaming-scrubber"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const nextPlayhead = routeDuration * Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                const located = locatePlayback(activeRoute, nextPlayhead);
                setPlayhead(nextPlayhead);
                if (located.stop) {
                  setSelectedStopId(located.stop.id);
                  setKeyframeTime(Number(located.localTime.toFixed(1)));
                }
              }}
            >
              <span style={{ width: `${routeDuration ? (playhead / routeDuration) * 100 : 0}%` }} />
            </div>
          </div>
        </section>

        <aside className="roaming-inspector">
          <div className="roaming-section-heading"><div><Route size={17} /><strong>路线设置</strong></div></div>
          <label>路线名称<input value={activeRoute.name} onChange={(event) => patchRoute(activeRoute.id, { name: event.target.value })} /></label>
          <div className="roaming-summary"><span><strong>{activeRoute.stops.length}</strong>个场景</span><span><strong>{Math.round(routeDuration)}</strong>秒</span></div>
          {selectedStop ? (
            <div className="roaming-stop-editor">
              <div className="roaming-selection-summary"><span>当前片段</span><strong>{selectedScene?.name}</strong></div>
              <label>
                场景时长
                <div className="roaming-number-field">
                  <input type="number" min="2" max="120" step="0.5" value={selectedStop.duration} onChange={(event) => patchStop(selectedStop.id, { duration: Math.max(2, Math.min(120, Number(event.target.value) || 2)) })} />
                  <span>秒</span>
                </div>
              </label>
              <div className="roaming-keyframe-capture">
                <div><Crosshair size={16} /><strong>视角关键帧</strong></div>
                <p>在预览中拖到目标角度，再添加到当前时间。</p>
                <div className="roaming-capture-row">
                  <input type="number" min="0" max={selectedStop.duration} step="0.1" value={keyframeTime} onChange={(event) => setKeyframeTime(event.target.value)} />
                  <button type="button" onClick={addCameraKeyframe}><Plus size={15} />添加当前镜头</button>
                </div>
                <label className="roaming-zoom-control">
                  镜头拉近 {Math.round(fovToZoom(draftView.fov || 70))}%
                  <input type="range" min="80" max="230" value={Math.round(fovToZoom(draftView.fov || 70))} onChange={(event) => setDraftView((view) => ({ ...view, fov: zoomToFov(event.target.value) }))} />
                </label>
                <small>Yaw {Math.round(draftView.yaw)}° · Pitch {Math.round(draftView.pitch)}° · 拉近 {Math.round(fovToZoom(draftView.fov || 70))}%</small>
              </div>
              <div className="roaming-keyframe-list">
                {selectedStop.cameraKeyframes.map((keyframe, index) => (
                  <div key={keyframe.id} className="roaming-keyframe-row" style={{ gridTemplateColumns: '20px repeat(4,minmax(0,1fr)) 28px' }}>
                    <span>{index + 1}</span>
                    <label>时间<input type="number" min="0" max={selectedStop.duration} step="0.1" value={keyframe.time} onChange={(event) => patchCameraKeyframe(keyframe.id, { time: Math.max(0, Math.min(selectedStop.duration, Number(event.target.value) || 0)) })} /></label>
                    <label>Yaw<input type="number" min="-180" max="180" value={Math.round(keyframe.yaw)} onChange={(event) => patchCameraKeyframe(keyframe.id, { yaw: Number(event.target.value) || 0 })} /></label>
                    <label>Pitch<input type="number" min="-78" max="78" value={Math.round(keyframe.pitch)} onChange={(event) => patchCameraKeyframe(keyframe.id, { pitch: Number(event.target.value) || 0 })} /></label>
                    <label>拉近%<input type="number" min="80" max="230" value={Math.round(keyframe.zoom || fovToZoom(keyframe.fov || 70))} onChange={(event) => { const zoom = Math.max(80, Math.min(230, Number(event.target.value) || 100)); patchCameraKeyframe(keyframe.id, { zoom, fov: zoomToFov(zoom) }); }} /></label>
                    <button type="button" onClick={() => deleteCameraKeyframe(keyframe.id)} disabled={selectedStop.cameraKeyframes.length <= 1} title="删除关键帧"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <section className="roaming-guide-assets">
            <div className="roaming-subheading"><ImagePlus size={16} /><strong>导游动作 WebP</strong></div>
            {GUIDE_ACTIONS.map((action) => {
              const asset = config.guide.assets[action.id];
              return (
                <div className="roaming-guide-asset-row" key={action.id}>
                  <strong>{action.label}</strong>
                  <span>{asset.url ? asset.name || '已添加' : '未添加'}</span>
                  <label title={`上传${action.label} WebP`}><Upload size={14} /><input type="file" accept="image/webp,.webp" hidden onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUploadGuide(action.id, file);
                    event.target.value = '';
                  }} /></label>
                  <button type="button" onClick={() => addGuideAction(action.id)} disabled={!selectedStop || !asset.url} title={`添加${action.label}到导游轨道`}><Plus size={14} /></button>
                  <button type="button" onClick={() => deleteGuideAsset(action.id)} disabled={!asset.url} title={`删除${action.label}素材`}><Trash2 size={14} /></button>
                </div>
              );
            })}
          </section>
          {selectedGuideClip ? (
            <section className="roaming-clip-inspector">
              <div className="roaming-subheading"><Upload size={16} /><strong>导游片段</strong></div>
              <div className="roaming-inline-fields">
                <label>独立开始<input type="number" min="0" max={Math.max(0, selectedStop.duration - 0.5)} step="0.1" value={selectedGuideClip.start} onChange={(event) => patchGuideClip(selectedGuideClip.id, { start: Math.max(0, Math.min(selectedStop.duration - 0.5, Number(event.target.value) || 0)) })} /></label>
                <label>独立时长<input type="number" min="0.5" max={Math.max(0.5, selectedStop.duration - selectedGuideClip.start)} step="0.1" value={selectedGuideClip.duration} onChange={(event) => patchGuideClip(selectedGuideClip.id, { duration: Math.max(0.5, Math.min(selectedStop.duration - selectedGuideClip.start, Number(event.target.value) || 0.5)) })} /></label>
              </div>
              <GuidePositionFields label="电脑端" value={selectedGuideClip.desktop} onChange={(desktop) => patchGuideClip(selectedGuideClip.id, { desktop })} />
              <GuidePositionFields label="手机端" value={selectedGuideClip.mobile} onChange={(mobile) => patchGuideClip(selectedGuideClip.id, { mobile })} />
              <button className="roaming-clip-delete" type="button" onClick={() => deleteGuideClip(selectedGuideClip.id)}><Trash2 size={14} />删除导游片段</button>
            </section>
          ) : null}
          <section className="roaming-track-upload-tools">
            <label className={!selectedStop ? 'is-disabled' : ''}><FileAudio size={15} />添加解说音频<input type="file" accept="audio/*" hidden disabled={!selectedStop} onChange={(event) => { const file = event.target.files?.[0]; if (file) addNarration(file); event.target.value = ''; }} /></label>
            <label className={!selectedStop ? 'is-disabled' : ''}><Images size={15} />插入图片<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" hidden disabled={!selectedStop} onChange={(event) => { const file = event.target.files?.[0]; if (file) addImage(file); event.target.value = ''; }} /></label>
          </section>
          {selectedNarrationClip ? (
            <section className="roaming-clip-inspector">
              <div className="roaming-subheading"><FileAudio size={16} /><strong>解说片段</strong></div>
              <label>音频文件<input value={selectedNarrationClip.name} readOnly /></label>
              <div className="roaming-inline-fields">
                <label>开始<input type="number" min="0" max={Math.max(0, selectedStop.duration - 0.5)} step="0.1" value={selectedNarrationClip.start} onChange={(event) => patchNarrationClip(selectedNarrationClip.id, { start: Math.max(0, Math.min(selectedStop.duration - 0.5, Number(event.target.value) || 0)) })} /></label>
                <label>时长<input type="number" min="0.5" max={Math.max(0.5, selectedStop.duration - selectedNarrationClip.start)} step="0.1" value={selectedNarrationClip.duration} onChange={(event) => patchNarrationClip(selectedNarrationClip.id, { duration: Math.max(0.5, Math.min(selectedStop.duration - selectedNarrationClip.start, Number(event.target.value) || 0.5)) })} /></label>
              </div>
              <label>音频起点<input type="number" min="0" step="0.1" value={selectedNarrationClip.trimStart || 0} onChange={(event) => patchNarrationClip(selectedNarrationClip.id, { trimStart: Math.max(0, Number(event.target.value) || 0) })} /></label>
              <button className="roaming-clip-delete" type="button" onClick={() => deleteNarrationClip(selectedNarrationClip.id)}><Trash2 size={14} />删除解说片段</button>
            </section>
          ) : null}
          {selectedImageClip ? (
            <section className="roaming-clip-inspector">
              <div className="roaming-subheading"><Images size={16} /><strong>图片片段</strong></div>
              <label>图片文件<input value={selectedImageClip.name} readOnly /></label>
              <div className="roaming-inline-fields">
                <label>开始<input type="number" min="0" max={Math.max(0, selectedStop.duration - 0.5)} step="0.1" value={selectedImageClip.start} onChange={(event) => patchImageClip(selectedImageClip.id, { start: Math.max(0, Math.min(selectedStop.duration - 0.5, Number(event.target.value) || 0)) })} /></label>
                <label>时长<input type="number" min="0.5" max={Math.max(0.5, selectedStop.duration - selectedImageClip.start)} step="0.1" value={selectedImageClip.duration} onChange={(event) => patchImageClip(selectedImageClip.id, { duration: Math.max(0.5, Math.min(selectedStop.duration - selectedImageClip.start, Number(event.target.value) || 0.5)) })} /></label>
              </div>
              <ImagePositionFields label="电脑端" value={selectedImageClip.desktop} onChange={(desktop) => patchImageClip(selectedImageClip.id, { desktop })} />
              <ImagePositionFields label="手机端" value={selectedImageClip.mobile} onChange={(mobile) => patchImageClip(selectedImageClip.id, { mobile })} />
              <button className="roaming-clip-delete" type="button" onClick={() => deleteImageClip(selectedImageClip.id)}><Trash2 size={14} />删除图片片段</button>
            </section>
          ) : null}
          <button className="roaming-delete-route" type="button" onClick={deleteRoute} disabled={config.routes.length <= 1}><Trash2 size={16} />删除当前路线</button>
        </aside>
      </section>

      <section className="roaming-timeline">
        <div className="roaming-timeline-ruler"><span>时间轴</span><div>{Array.from({ length: 11 }, (_, index) => <i key={index}>{index * 5}s</i>)}</div></div>
        <TimelineRow label="场景轨道" icon={<Film size={16} />}>
          {activeRoute.stops.map((stop) => {
            const scene = scenes.find((item) => item.id === stop.sceneId);
            return (
              <button className={`roaming-scene-clip ${selectedStop?.id === stop.id ? 'is-active' : ''}`} style={{ width: `${Math.max(110, stop.duration * 18)}px` }} type="button" key={stop.id} onClick={() => { setSelectedStopId(stop.id); setKeyframeTime(0); setPlayhead(stopStartTime(activeRoute, stop.id)); }}>
                <span style={{ backgroundImage: `url(${scene?.thumbnailUrl || scene?.imageUrl || ''})` }} /><strong>{scene?.name || '场景已删除'}</strong><small>{stop.duration}秒</small>
                <i onClick={(event) => { event.stopPropagation(); removeStop(stop.id); }}><Trash2 size={13} /></i>
              </button>
            );
          })}
        </TimelineRow>
        <TimelineRow label="镜头轨道" icon={<Camera size={16} />}>
          {activeRoute.stops.length ? activeRoute.stops.map((stop) => (
            <div className="roaming-camera-clip" key={stop.id} style={{ width: `${Math.max(110, stop.duration * 18)}px` }}>
              {stop.cameraKeyframes.map((keyframe, index) => (
                <button
                  type="button"
                  key={keyframe.id}
                  style={{ left: `${Math.max(3, Math.min(97, (keyframe.time / stop.duration) * 100))}%`, top: `${12 + (index % 3) * 12}px`, marginLeft: `${(index % 3) * 5}px` }}
                  title={`${keyframe.time}秒 · Yaw ${Math.round(keyframe.yaw)}°`}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedStopId(stop.id);
                    setKeyframeTime(keyframe.time);
                    setPlayhead(stopStartTime(activeRoute, stop.id) + keyframe.time);
                    setDraftView({ yaw: keyframe.yaw, pitch: keyframe.pitch, fov: keyframe.fov || 70 });
                  }}
                >{index + 1}</button>
              ))}
            </div>
          )) : <div className="roaming-track-placeholder">选择场景片段后添加视角关键帧</div>}
        </TimelineRow>
        <TimelineRow label="导游轨道" icon={<Upload size={16} />}>
          {activeRoute.stops.length ? activeRoute.stops.map((stop) => (
            <div className="roaming-overlay-track" key={stop.id} style={{ width: `${Math.max(110, stop.duration * 18)}px` }}>
              {stop.guideClips.map((clip) => (
                <button
                  type="button"
                  className={`roaming-action-clip ${selectedGuideClipId === clip.id ? 'is-active' : ''}`}
                  key={clip.id}
                  style={{ left: `${(clip.start / stop.duration) * 100}%`, width: `${Math.max(14, (clip.duration / stop.duration) * 100)}%` }}
                  onClick={() => { setSelectedStopId(stop.id); setSelectedGuideClipId(clip.id); setSelectedNarrationClipId(''); setSelectedImageClipId(''); }}
                >
                  {GUIDE_ACTIONS.find((action) => action.id === clip.action)?.label || '动作'}
                </button>
              ))}
            </div>
          )) : <div className="roaming-track-placeholder">先添加场景片段</div>}
        </TimelineRow>
        <TimelineRow label="解说轨道" icon={<FileAudio size={16} />}>
          {activeRoute.stops.length ? activeRoute.stops.map((stop) => (
            <div className="roaming-overlay-track" key={stop.id} style={{ width: `${Math.max(110, stop.duration * 18)}px` }}>
              {stop.narrationClips.map((clip) => (
                <button
                  type="button"
                  className={`roaming-narration-clip ${selectedNarrationClipId === clip.id ? 'is-active' : ''}`}
                  key={clip.id}
                  style={{ left: `${(clip.start / stop.duration) * 100}%`, width: `${Math.max(14, (clip.duration / stop.duration) * 100)}%` }}
                  onClick={() => { setSelectedStopId(stop.id); setSelectedNarrationClipId(clip.id); setSelectedGuideClipId(''); setSelectedImageClipId(''); }}
                >
                  {clip.name}
                </button>
              ))}
            </div>
          )) : <div className="roaming-track-placeholder">先添加场景片段</div>}
        </TimelineRow>
        <TimelineRow label="图片轨道" icon={<Images size={16} />}>
          {activeRoute.stops.length ? activeRoute.stops.map((stop) => (
            <div className="roaming-overlay-track" key={stop.id} style={{ width: `${Math.max(110, stop.duration * 18)}px` }}>
              {stop.imageClips.map((clip) => (
                <button
                  type="button"
                  className={`roaming-image-clip ${selectedImageClipId === clip.id ? 'is-active' : ''}`}
                  key={clip.id}
                  style={{ left: `${(clip.start / stop.duration) * 100}%`, width: `${Math.max(14, (clip.duration / stop.duration) * 100)}%` }}
                  onClick={() => { setSelectedStopId(stop.id); setSelectedImageClipId(clip.id); setSelectedGuideClipId(''); setSelectedNarrationClipId(''); }}
                >
                  {clip.name}
                </button>
              ))}
            </div>
          )) : <div className="roaming-track-placeholder">先添加场景片段</div>}
        </TimelineRow>
      </section>
    </main>
  );
}

function TimelineRow({ label, icon, children }) {
  return <div className="roaming-track-row"><div className="roaming-track-label">{icon}<span>{label}</span></div><div className="roaming-track-content">{children}</div></div>;
}

function GuidePositionFields({ label, value, onChange }) {
  const field = (key, next) => onChange({ ...value, [key]: Number(next) || 0 });
  return (
    <fieldset className="roaming-position-fields">
      <legend>{label}</legend>
      <label>X<input type="number" min="0" max="100" value={value.x} onChange={(event) => field('x', event.target.value)} /></label>
      <label>Y<input type="number" min="0" max="100" value={value.y} onChange={(event) => field('y', event.target.value)} /></label>
      <label>终点X<input type="number" min="0" max="100" value={value.endX} onChange={(event) => field('endX', event.target.value)} /></label>
      <label>终点Y<input type="number" min="0" max="100" value={value.endY} onChange={(event) => field('endY', event.target.value)} /></label>
      <label>大小<input type="number" min="8" max="34" value={value.size} onChange={(event) => field('size', event.target.value)} /></label>
      <label>倾斜<input type="number" min="-45" max="45" value={value.tilt} onChange={(event) => field('tilt', event.target.value)} /></label>
    </fieldset>
  );
}

function ImagePositionFields({ label, value, onChange }) {
  const field = (key, next) => onChange({ ...value, [key]: Number(next) || 0 });
  return (
    <fieldset className="roaming-position-fields roaming-image-position-fields">
      <legend>{label}</legend>
      <label>X<input type="number" min="0" max="100" value={value.x} onChange={(event) => field('x', event.target.value)} /></label>
      <label>Y<input type="number" min="0" max="100" value={value.y} onChange={(event) => field('y', event.target.value)} /></label>
      <label>大小<input type="number" min="8" max="90" value={value.size} onChange={(event) => field('size', event.target.value)} /></label>
    </fieldset>
  );
}

function locatePlayback(route, time) {
  let cursor = 0;
  for (const stop of route?.stops || []) {
    const end = cursor + Number(stop.duration || 0);
    if (time <= end) return { stop, localTime: Math.max(0, time - cursor), start: cursor };
    cursor = end;
  }
  const stop = route?.stops?.[route.stops.length - 1];
  return { stop, localTime: Number(stop?.duration || 0), start: Math.max(0, cursor - Number(stop?.duration || 0)) };
}

function stopStartTime(route, stopId) {
  let cursor = 0;
  for (const stop of route?.stops || []) {
    if (stop.id === stopId) return cursor;
    cursor += Number(stop.duration || 0);
  }
  return 0;
}

function interpolateCamera(stop, localTime, fallback) {
  const frames = [...(stop?.cameraKeyframes || [])].sort((a, b) => a.time - b.time);
  if (!frames.length) return fallback;
  if (localTime == null) return fallback?.yaw == null ? frames[0] : fallback;
  const nextIndex = frames.findIndex((frame) => frame.time >= localTime);
  if (nextIndex <= 0) return frames[0];
  if (nextIndex < 0) return frames[frames.length - 1];
  const before = frames[nextIndex - 1];
  const after = frames[nextIndex];
  const span = Math.max(0.001, after.time - before.time);
  const progress = Math.max(0, Math.min(1, (localTime - before.time) / span));
  const yawDelta = ((((after.yaw - before.yaw) + 180) % 360) + 360) % 360 - 180;
  return {
    yaw: before.yaw + yawDelta * progress,
    pitch: before.pitch + (after.pitch - before.pitch) * progress,
    fov: (before.fov || 70) + ((after.fov || 70) - (before.fov || 70)) * progress,
  };
}

function interpolateGuidePlacement(clip, localTime) {
  const placement = clip?.desktop || { x: 82, y: 72, endX: 82, endY: 72, size: 14, tilt: 0 };
  if (!clip || localTime == null || clip.action !== 'flying') return placement;
  const progress = Math.max(0, Math.min(1, (localTime - clip.start) / Math.max(0.1, clip.duration)));
  return {
    ...placement,
    x: placement.x + (placement.endX - placement.x) * progress,
    y: placement.y + (placement.endY - placement.y) * progress,
  };
}

function formatDuration(value) {
  const seconds = Math.max(0, Math.round(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
