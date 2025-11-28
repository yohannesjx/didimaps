# Map Platform Setup Instructions

## 1. Current Status
- **Frontend (Web)**: Next.js app configured with MapLibre GL JS and Dark Matter theme.
- **Frontend (Mobile)**: Flutter app scaffolded in `mobile/` directory.
- **Backend**: Go API with JWT auth, PostGIS integration, and tile proxying.
- **Database**: PostgreSQL + PostGIS with complete schema for users, businesses, posts.
- **Infrastructure**: Docker Compose with Caddy, Tileserver, OSRM, Nominatim, Postgres, PgAdmin.

## 2. Missing Assets (Action Required)
To make the map look correct (icons and text), you need to manually add the sprites and fonts.

### Sprites
1.  Download a sprite set (e.g., from [OpenMapTiles](https://github.com/openmaptiles/osm-bright-gl-style) or generate your own).
2.  You need 4 files:
    - `sprite.png`
    - `sprite.json`
    - `sprite@2x.png`
    - `sprite@2x.json`
3.  Place them in: `frontend-next/public/map-assets/sprites/`

### Fonts
1.  Download Mapbox GL compatible PBF fonts (e.g., from [OpenMapTiles Fonts](https://github.com/openmaptiles/fonts)).
2.  You need folders for each font family (e.g., `Metropolis Regular`, `Noto Sans Regular`, etc.).
3.  Place them in: `frontend-next/public/map-assets/fonts/`
    - Example: `frontend-next/public/map-assets/fonts/Metropolis Regular/0-255.pbf`

## 3. Deployment

### Server Setup
1.  **Upload to VPS**:
    ```bash
    rsync -avz --exclude 'node_modules' --exclude '.git' ./ user@vps:/path/to/maps/
    ```

2.  **Start Services**:
    On the VPS, run:
    ```bash
    docker-compose up -d --build
    ```

3.  **Verify**:
    - Web: `https://maps.didi.et`
    - API: `https://maps.didi.et/api/health`
    - Tiles: `https://maps.didi.et/tiles/0/0/0.pbf`
    - PgAdmin: `https://maps.didi.et/pgadmin` (or via port 80 if not configured in Caddy)

### Mobile App
1.  **Development**:
    Navigate to `mobile/` directory on your local machine.
    ```bash
    cd mobile
    flutter pub get
    flutter run
    ```
2.  **Build**:
    ```bash
    flutter build apk --release
    ```

## 4. Troubleshooting
- **Map Style**: The style is configured to use `https://maps.didi.et/tiles/...`. Ensure this URL is accessible from your device.
- **Database**: Connect to PgAdmin with `admin@didi.et` / `admin`.
- **Tiles**: If tiles are missing, ensure `data/tiles/addis.mbtiles` exists and is readable by `tileserver`.
