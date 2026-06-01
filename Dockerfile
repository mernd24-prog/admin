FROM node:20-alpine AS build

WORKDIR /app

ARG REACT_APP_API_BASE_URL=http://localhost:4000
ARG REACT_APP_SOCKET_URL=http://localhost:4000
ARG REACT_APP_PANEL_MODE=

ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
ENV REACT_APP_PANEL_MODE=$REACT_APP_PANEL_MODE

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
