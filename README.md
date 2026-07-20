# 泰安基地 360 全景展示生成器

这是一个 React + Three.js 的学校全景展示生成器。编辑端用于上传 360 全景图、配置楼栋楼层、调整热点和地图点位；发布端会生成一个可以单独上线的 HTML 浏览页。

## 技术路线

- 前端框架：React + Vite
- 全景渲染：Three.js 球面反贴图
- 动效：GSAP，用于场景和热点过渡
- 地图：SVG 总平面图 + JPG 楼层疏散图
- 内容管理：当前为前端状态管理，后续可接 Node.js / Java / PHP 后台
- 图片上传：当前使用浏览器本地 `data:` URL，发布 HTML 会内嵌上传图片
- 发布方式：生成独立 `taian-campus-360-tour.html`，浏览页不依赖编辑器

## 当前功能

- 上传当前场景全景图
- Three.js 360 全景拖拽浏览
- 按户外、1号楼、2号楼、3号楼、4号楼管理场景
- 每个楼栋按楼层管理点位
- 热点新增、编辑、删除
- 热点可通过表单滑块或直接拖动画面中的热点调整位置
- 总平面分布图联动
- 楼层疏散图联动
- 保存配置到 `localStorage`
- 发布浏览页并自动打开预览
- 导出独立 HTML 文件
- PC 和移动端响应式布局

## 地图素材

项目已内置以下楼层疏散图：

- 一号楼：1层、2层、3层
- 二号楼：1层、2层
- 三号楼：1层、2层
- 四号楼：负1层、1层

## 推荐后台接口

后续接后台时，无论使用 Node.js、Java 还是 PHP，都建议保持以下数据模型：

```text
POST /api/assets/panorama
上传全景图片，返回图片 URL、宽高、文件大小、缩略图 URL

GET /api/projects/:id
读取全景项目配置

PUT /api/projects/:id
保存场景、热点、地图、导览路线和文案配置

POST /api/projects/:id/publish
生成可公开访问的全景浏览页，或返回可下载 HTML
```

核心配置结构：

```json
{
  "projectName": "学校360全景展示",
  "activeSceneId": "gate",
  "scenes": [
    {
      "id": "gate",
      "name": "学校大门",
      "imageUrl": "/uploads/gate.jpg",
      "description": "入口场景说明",
      "map": { "x": 25, "y": 56 },
      "hotspots": [
        {
          "id": "h1",
          "label": "前往教学楼",
          "type": "跳转",
          "yaw": -28,
          "pitch": 2,
          "target": "教学楼"
        }
      ]
    }
  ]
}
```

## 本地运行

```bash
npm install
npm run dev
```

访问：

```text
http://localhost:5173
```
