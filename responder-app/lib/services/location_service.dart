import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LocationService {
  static StreamSubscription<Position>? _positionStream;
  static bool _shouldTrack = true;

  static const LocationSettings _settings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 10, // metres — only update when moved ≥10 m
  );

  // ── Request permission ────────────────────────────────────────────────────
  static Future<bool> requestPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  // ── Start streaming position → Firestore ─────────────────────────────────
  static Future<void> startTracking() async {
    if (_positionStream != null) return; // already running

    final granted = await requestPermission();
    if (!granted) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    final displayName = user.displayName ??
        user.email?.split('@').first ??
        'Responder';

    _positionStream =
        Geolocator.getPositionStream(locationSettings: _settings)
            .listen((Position position) {
      if (!_shouldTrack) return;
      FirebaseFirestore.instance
          .collection('responders')
          .doc(user.uid)
          .set({
        'lat': position.latitude,
        'lng': position.longitude,
        'updatedAt': FieldValue.serverTimestamp(),
        'status': 'idle',
        'displayName': displayName,
      }, SetOptions(merge: true));
    });
  }

  // ── Update status field only (lat/lng unchanged) ──────────────────────────
  static Future<void> updateStatus(String status) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    await FirebaseFirestore.instance
        .collection('responders')
        .doc(user.uid)
        .set({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    if (status == 'off_duty' || status == 'busy') {
      _shouldTrack = false;
    } else if (status == 'idle') {
      _shouldTrack = true;
    }
  }

  // ── Stop streaming ────────────────────────────────────────────────────────
  static void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
  }
}
