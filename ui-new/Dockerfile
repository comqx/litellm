# syntax=docker/dockerfile:1.7

# UI container — locally built Next.js static export, served by nginx.
# Compile with `npm run build` in ui-new/litellm-dashboard before `docker build`.

ARG NGINX_VERSION=1.31.5-alpine3.24@sha256:34f40471dea485273c5e2a04dd5e97a682332ceb4a9adecd67de450dcb2fb390

FROM nginx:${NGINX_VERSION}

# Drop the upstream default :80 server; we own the config.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY ui-new/litellm-dashboard/out /usr/share/nginx/html
COPY ui-new/nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000/tcp

# nginx as PID 1 in foreground; respects SIGTERM out of the box, so
# no tini/dumb-init wrapper needed.
CMD ["nginx", "-g", "daemon off;"]
