import 'package:flutter/material.dart';
import 'package:maplibre_gl/maplibre_gl.dart';

class MapWidget extends StatefulWidget {
  const MapWidget({super.key});

  @override
  State<MapWidget> createState() => _MapWidgetState();
}

class _MapWidgetState extends State<MapWidget> {
  MapLibreMapController? mapController;

  void _onMapCreated(MapLibreMapController controller) {
    mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    return MapLibreMap(
      onMapCreated: _onMapCreated,
      // Use the local style JSON served by the API/Caddy
      // Ensure the mobile device can access this URL (e.g., via public IP or local network)
      styleString: 'https://maps.didi.et/map-assets/style.json',
      initialCameraPosition: const CameraPosition(
        target: LatLng(8.9806, 38.7578), // Addis Ababa
        zoom: 12.0,
      ),
      myLocationEnabled: true,
      trackCameraPosition: true,
      attributionButtonPosition: AttributionButtonPosition.BottomRight,
    );
  }
}
