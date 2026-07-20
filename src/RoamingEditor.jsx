import { useMemo, useState } from 'react';
import { ArrowLeft, Film, Music2, Pause, Play, Plus, Route, Save, Trash2, Upload } from 'lucide-react';
import PanoramaViewer from './PanoramaViewer.jsx';
import { createRoamingRoute, createRoamingStop } from './roamingConfig.js';
import './RoamingEditor.css';

export default function RoamingEditor({ config, scenes, onChange, onBack, onSave, onUploadMusic, isSaving }) {
  const activeRoute = config.routes.find((route) => route.id === config.activeRouteId) || config.routes[0];
  const [selectedStopId, setSelectedStopId] = useState(activeRoute?.stops?.[0]?.id || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const selectedStop = activeRoute?.stops.find((stop) => stop.id === selectedStopId) || activeRoute?.stops?.[0];
  const selectedScene = scenes.find((scene) => scene.id === selectedStop?.sceneId) || scenes[0];
  const routeDuration = useMemo(
    () => (activeRoute?.stops || []).reduce((total, stop) => total + Number(stop.duration || 0), 0),
    [activeRoute],
  );

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
            {selectedScene ? (
              <PanoramaViewer
                imageUrl={selectedScene.imageUrl}
                krpanoTiles={selectedScene.krpanoTiles}
                hotspots={[]}
                initialYaw={selectedStop?.cameraKeyframes?.[0]?.yaw ?? selectedScene.initialYaw ?? -24}
                initialPitch={selectedStop?.cameraKeyframes?.[0]?.pitch ?? selectedScene.initialPitch ?? 1}
                imageRoll={selectedScene.imageRoll || 0}
              />
            ) : (
              <div className="roaming-empty-preview"><Route size={32} /><span>从左侧添加场景开始制作路线</span></div>
            )}
          </div>
          <div className="roaming-transport">
            <button type="button" onClick={() => setIsPlaying((value) => !value)} title={isPlaying ? '暂停预览' : '播放预览'}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span>00:00 / {formatDuration(routeDuration)}</span><div><span style={{ width: '0%' }} /></div>
          </div>
        </section>

        <aside className="roaming-inspector">
          <div className="roaming-section-heading"><div><Route size={17} /><strong>路线设置</strong></div></div>
          <label>路线名称<input value={activeRoute.name} onChange={(event) => patchRoute(activeRoute.id, { name: event.target.value })} /></label>
          <div className="roaming-summary"><span><strong>{activeRoute.stops.length}</strong>个场景</span><span><strong>{Math.round(routeDuration)}</strong>秒</span></div>
          {selectedStop ? (
            <div className="roaming-selection-summary"><span>当前片段</span><strong>{selectedScene?.name}</strong><small>角度、时间和动作将在后续阶段在此编辑</small></div>
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
              <button className={`roaming-scene-clip ${selectedStop?.id === stop.id ? 'is-active' : ''}`} style={{ width: `${Math.max(110, stop.duration * 18)}px` }} type="button" key={stop.id} onClick={() => setSelectedStopId(stop.id)}>
                <span style={{ backgroundImage: `url(${scene?.thumbnailUrl || scene?.imageUrl || ''})` }} /><strong>{scene?.name || '场景已删除'}</strong><small>{stop.duration}秒</small>
                <i onClick={(event) => { event.stopPropagation(); removeStop(stop.id); }}><Trash2 size={13} /></i>
              </button>
            );
          })}
        </TimelineRow>
        <TimelineRow label="镜头轨道" icon={<Route size={16} />}><div className="roaming-track-placeholder">选择场景片段后添加视角关键帧</div></TimelineRow>
        <TimelineRow label="导游轨道" icon={<Upload size={16} />}><div className="roaming-track-placeholder">打招呼、说话、飞行移动、暂停、离场、指路</div></TimelineRow>
        <TimelineRow label="文字轨道" icon={<Film size={16} />}><div className="roaming-track-placeholder">添加自定义文字片段</div></TimelineRow>
      </section>
    </main>
  );
}

function TimelineRow({ label, icon, children }) {
  return <div className="roaming-track-row"><div className="roaming-track-label">{icon}<span>{label}</span></div><div className="roaming-track-content">{children}</div></div>;
}

function formatDuration(value) {
  const seconds = Math.max(0, Math.round(value || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
