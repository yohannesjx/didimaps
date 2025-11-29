# Map Service Quick Reference

## 🚀 Quick Start

### 1. Start Infrastructure
```bash
cd /Users/gashawarega/Documents/Projects/maps
./setup.sh
```

### 2. Start Map Service
```bash
cd api
go run cmd/api/main.go
```

### 3. Start Flutter App
```bash
cd /Users/gashawarega/Documents/Projects/super_flutter
flutter pub get
flutter run
```

## 📡 API Quick Reference

### Search POIs
```bash
curl "http://localhost:8080/api/business/search?q=restaurant&lat=9.03&lng=38.74"
```

### Get Nearby POIs
```bash
curl "http://localhost:8080/api/business/nearby?lat=9.03&lng=38.74&radius=2000"
```

### Get Categories
```bash
curl "http://localhost:8080/api/categories"
```

### Get Route
```bash
curl "http://localhost:8080/api/route?from=9.03,38.74&to=9.01,38.76"
```

### Publish POI (Internal)
```bash
curl -X POST http://localhost:8080/internal/publish \
  -H "Content-Type: application/json" \
  -d '{
    "id": "rest_123",
    "source": "food_service",
    "name": "Yod Abyssinia",
    "lat": 9.0192,
    "lng": 38.7525,
    "type": "restaurant",
    "metadata": {"cuisine": "Ethiopian"}
  }'
```

## 🔧 Common Tasks

### Add Test POI
```bash
curl -X POST http://localhost:8080/internal/publish \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_'$(date +%s)'",
    "source": "test",
    "name": "Test Restaurant",
    "lat": 9.03,
    "lng": 38.74,
    "type": "restaurant"
  }'
```

### Check Database
```bash
docker exec -it maps-postgres psql -U postgres -d maps_db
```

```sql
-- Count POIs
SELECT COUNT(*) FROM businesses;

-- View recent POIs
SELECT id, name, source, ST_AsText(geom) FROM businesses ORDER BY created_at DESC LIMIT 10;

-- Search POIs
SELECT name, source FROM businesses WHERE name ILIKE '%restaurant%';
```

### Update Map Service URL in Flutter
Edit: `super_flutter/lib/features/map/data/providers/map_service.dart`
```dart
return MapService(baseUrl: 'http://YOUR_IP:8080');
```

## 🐛 Troubleshooting

### Map tiles not loading
```bash
# Check mbtileserver
docker ps | grep mbtileserver

# Use demo tiles temporarily
# Already configured in MapPage: "https://demotiles.maplibre.org/style.json"
```

### No search results
```bash
# Check database has data
docker exec -it maps-postgres psql -U postgres -d maps_db -c "SELECT COUNT(*) FROM businesses;"

# Add test data
curl -X POST http://localhost:8080/internal/publish -H "Content-Type: application/json" -d '{"id":"test1","source":"test","name":"Test Cafe","lat":9.03,"lng":38.74,"type":"cafe"}'
```

### Routes not working
```bash
# OSRM uses public server by default
# Check OSRM_HOST in .env or use: https://router.project-osrm.org
```

### Flutter build errors
```bash
cd super_flutter
flutter clean
flutter pub get
flutter run
```

## 📱 Flutter Navigation

### Home → Map
```dart
context.push('/map');
```

### Map → Food Ordering
```dart
context.push('/food');
```

### Map → Grocery Ordering
```dart
context.push('/grocery');
```

### Map → Pharmacy Ordering
```dart
context.push('/pharmacy');
```

## 🔐 Environment Variables

### Map Service (.env)
```env
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maps_db
DB_USER=postgres
DB_PASSWORD=postgres
OSRM_HOST=http://localhost:5000
TILE_HOST=http://localhost:8081
JWT_SECRET=your-secret-key
RATE_LIMIT=100
```

## 📊 Key Metrics

### Database Indexes
- `idx_businesses_geom` - Spatial queries (GIST)
- `idx_businesses_name_trgm` - Text search (GIN)
- `idx_businesses_source_external_id` - Unique POIs

### Performance Tips
- Use `radius` parameter to limit nearby queries
- Add `limit` parameter to search queries
- Cache category list in Flutter app
- Use debouncing for search (already implemented)

## 🎯 Integration Checklist

- [x] Map service running on port 8080
- [x] PostGIS database initialized
- [x] Flutter app updated with maplibre_gl
- [x] Map tile added to home screen
- [x] Search functionality working
- [x] Category filtering working
- [x] POI selection and bottom sheet
- [ ] Food service publishing restaurants
- [ ] Grocery service publishing stores
- [ ] Pharmacy service publishing pharmacies
- [ ] Real-time driver tracking
- [ ] Custom map style

## 📚 Documentation

- **Full Guide**: `MAP_INTEGRATION.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`
- **This File**: `QUICK_REFERENCE.md`

## 🆘 Support

### Check Logs
```bash
# Map service logs
tail -f api/logs/app.log

# Database logs
docker logs maps-postgres

# Flutter logs
flutter logs
```

### Reset Everything
```bash
# Stop and remove containers
docker stop maps-postgres && docker rm maps-postgres

# Restart setup
./setup.sh
```

## 🎨 Customization

### Change Map Style
Edit: `super_flutter/lib/features/map/presentation/pages/map_page.dart`
```dart
styleString: "YOUR_CUSTOM_STYLE_URL",
```

### Add New Category
```sql
INSERT INTO categories (name, name_am, icon, sort_order) 
VALUES ('Gym', 'ጂም', 'dumbbell', 20);
```

### Change Default Location
Edit: `super_flutter/lib/features/map/presentation/pages/map_page.dart`
```dart
const lat = 9.03;  // Your latitude
const lng = 38.74; // Your longitude
```

---

**Last Updated**: 2025-11-30
**Version**: 1.0.0
