import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:maplibre_gl/maplibre_gl.dart';

/// Route data from backend
class RouteData {
  final int distanceMeters;
  final int durationSeconds;
  final String encodedPolyline;
  final List<RouteStep> steps;

  RouteData({
    required this.distanceMeters,
    required this.durationSeconds,
    required this.encodedPolyline,
    required this.steps,
  });

  factory RouteData.fromJson(Map<String, dynamic> json) {
    return RouteData(
      distanceMeters: json['distance_meters'],
      durationSeconds: json['duration_seconds'],
      encodedPolyline: json['geometry'],
      steps: (json['steps'] as List)
          .map((s) => RouteStep.fromJson(s))
          .toList(),
    );
  }

  String get distanceKm => (distanceMeters / 1000).toStringAsFixed(1);
  String get durationMin => (durationSeconds / 60).round().toString();
}

class RouteStep {
  final String instruction;
  final int distanceMeters;
  final int durationSeconds;
  final String name;

  RouteStep({
    required this.instruction,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.name,
  });

  factory RouteStep.fromJson(Map<String, dynamic> json) {
    return RouteStep(
      instruction: json['instruction'],
      distanceMeters: json['distance_meters'],
      durationSeconds: json['duration_seconds'],
      name: json['name'] ?? '',
    );
  }
}

/// Service to fetch routes from Super App backend
class RoutingService {
  final String baseUrl;

  RoutingService(this.baseUrl);

  Future<RouteData> getRoute({
    required double fromLat,
    required double fromLon,
    required double toLat,
    required double toLon,
  }) async {
    final url = Uri.parse('$baseUrl/api/v1/routing/route').replace(
      queryParameters: {
        'from_lat': fromLat.toString(),
        'from_lon': fromLon.toString(),
        'to_lat': toLat.toString(),
        'to_lon': toLon.toString(),
      },
    );

    final response = await http.get(url);

    if (response.statusCode == 200) {
      return RouteData.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to get route: ${response.statusCode}');
    }
  }
}

/// Example usage in MapNotifier
class MapNotifier extends StateNotifier<MapState> {
  final RoutingService routingService;

  MapNotifier(this.routingService) : super(MapState());

  Future<void> startNavigation(POI destination, {POI? origin}) async {
    final startLat = origin?.lat ?? state.userLat;
    final startLng = origin?.lng ?? state.userLng;

    if (startLat == null || startLng == null) return;

    state = state.copyWith(isLoading: true);
    
    try {
      // Fetch REAL route from backend
      final routeData = await routingService.getRoute(
        fromLat: startLat,
        fromLon: startLng,
        toLat: destination.lat,
        toLon: destination.lng,
      );

      // Decode polyline to coordinates
      final geometry = _decodePolyline(routeData.encodedPolyline);

      state = state.copyWith(
        isLoading: false,
        isNavigating: true,
        route: {
          'distance': '${routeData.distanceKm} km',
          'duration': '${routeData.durationMin} min',
          'geometry': geometry, // List of [lng, lat] arrays
          'steps': routeData.steps.map((s) => {
            'instruction': s.instruction,
            'distance': '${s.distanceMeters}m',
          }).toList(),
        },
        clearSelectedPOI: true,
      );
    } catch (e) {
      print('❌ Routing error: $e');
      state = state.copyWith(isLoading: false);
    }
  }

  /// Decode Google polyline format
  List<List<double>> _decodePolyline(String encoded) {
    List<List<double>> points = [];
    int index = 0;
    int len = encoded.length;
    int lat = 0;
    int lng = 0;

    while (index < len) {
      int b;
      int shift = 0;
      int result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      int dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.add([lng / 1E5, lat / 1E5]); // [lng, lat] for GeoJSON
    }

    return points;
  }
}
