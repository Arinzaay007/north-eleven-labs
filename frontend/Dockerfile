# Frontend Dockerfile - Multi-stage build
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 接收構建參數
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

# 複製套件配置檔案
COPY package.json yarn.lock ./

# 複製現有的 node_modules（避免構建時網路問題）
COPY node_modules ./node_modules

# 複製原始碼
COPY . .

# 構建生產版本
RUN yarn build

# Stage 2: Production
FROM nginx:alpine

# 複製構建產物
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
