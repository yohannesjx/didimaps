# VPS A - Pull and Restart Commands

## 1. SSH to VPS A
```bash
ssh root@196.188.188.163
```

## 2. Navigate to project directory
```bash
cd /root/map/didimaps
```

## 3. Pull latest changes
```bash
git pull origin main
```

## 4. Restart Caddy to apply new configuration
```bash
docker-compose restart caddy
```

## 5. Verify the fix
Test that tiles are now accessible:
```bash
curl -I "https://maps.didi.et/api/tiles/14/10238/6387.pbf"
```

You should see `HTTP/2 200` and `content-type: application/x-protobuf`

## What was fixed:
- Added `/api/tiles/*` route to Caddyfile
- Now both `/tiles/*` and `/api/tiles/*` work
- Tiles are properly proxied from the internal tileserver to the public API

## After restart:
The Flutter app will automatically start loading vector tiles from your server!
