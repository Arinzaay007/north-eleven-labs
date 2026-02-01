# Qwen3-TTS Frontend

这是 Qwen3-TTS 语音克隆项目的前端界面实现。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **Lucide React** - 图标库

## 快速开始

### 1. 安装依赖

```bash
cd frontend
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动。

### 3. 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist/` 目录。

### 4. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
frontend/
├── src/
│   ├── App.tsx           # 主应用组件
│   ├── main.tsx          # 应用入口
│   └── index.css         # 全局样式
├── index.html            # HTML 模板
├── package.json          # 项目依赖
├── tailwind.config.js    # Tailwind 配置
├── vite.config.ts        # Vite 配置
└── tsconfig.json         # TypeScript 配置
```

## 功能特性

- ✅ 响应式导航栏
- ✅ 醒目的 Hero 区域
- ✅ 语音克隆操作界面
  - 参考音频上传区
  - 参考文本输入框
  - 目标文本输入框
  - 语言和模型选择
  - 生成按钮
  - 音频输出显示
- ✅ 完整的页脚
- ✅ 深色主题配色
- ✅ 渐变色和阴影效果

## 与后端集成

目前这是纯前端实现。要连接到 Python 后端，需要：

1. 在后端创建 API 端点（FastAPI 或 Flask）
2. 在前端添加 API 调用逻辑
3. 处理文件上传和音频生成

示例 API 端点结构：
- `POST /api/upload` - 上传参考音频
- `POST /api/clone` - 生成克隆语音
- `GET /api/output/:id` - 获取生成的音频

## 自定义配色

颜色在 `tailwind.config.js` 中定义：

```javascript
colors: {
  background: {
    primary: '#0a0d14',
    secondary: '#0f1218',
    tertiary: '#151820',
    elevated: '#1e2532',
  },
  brand: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
  },
  // ...更多颜色
}
```

## 浏览器支持

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)

## License

遵循主项目的 Apache 2.0 授权。
