# Admin And Seller Deployment

Use this file when you are already inside the `Admin` folder. For full VPS setup from PuTTY, use `../DEPLOYMENT_HANDBOOK.md`.

The same React build serves both admin and seller panels. Seller mode is detected from a hostname containing `seller`, for example `seller.example.com`.

## Environment

```bash
cp .env.example .env.production
nano .env.production
```

Production values:

```txt
REACT_APP_API_BASE_URL=https://<API_DOMAIN>
REACT_APP_SOCKET_URL=https://<API_DOMAIN>
REACT_APP_PANEL_MODE=
```

Do not add `/api/v1`; the code adds it automatically.

## Build

```bash
npm ci
npm run build
```

Serve this folder with Nginx:

```txt
Admin/build
```

## Docker

```bash
docker build \
  --build-arg REACT_APP_API_BASE_URL=https://<API_DOMAIN> \
  --build-arg REACT_APP_SOCKET_URL=https://<API_DOMAIN> \
  -t ecommerce-admin .

docker run -p 8080:80 ecommerce-admin
```

Use the same image/container for admin and seller. Put different hostnames in front of it with Nginx or your load balancer.
