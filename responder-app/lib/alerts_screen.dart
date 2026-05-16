import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'services/location_service.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  String _currentStatus = 'idle';

  @override
  void initState() {
    super.initState();
    LocationService.startTracking();
  }

  @override
  void dispose() {
    LocationService.stopTracking();
    super.dispose();
  }

  Future<void> _setResponderStatus(String status) async {
    setState(() => _currentStatus = status); // update UI immediately
    await LocationService.updateStatus(status);
  }

  Future<LatLng?> _geocode(String location) async {
    try {
      final encoded = Uri.encodeComponent(location);
      final url = Uri.parse(
        'https://nominatim.openstreetmap.org/search'
        '?q=$encoded&format=json&limit=1',
      );
      final res = await http.get(url, headers: {
        'User-Agent': 'MediLink-Responder/1.0'
      });
      final data = jsonDecode(res.body) as List;
      if (data.isEmpty) return null;
      return LatLng(
        double.parse(data[0]['lat']),
        double.parse(data[0]['lon']),
      );
    } catch (_) {
      return null;
    }
  }

  void _showStatusPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0d0020),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Set Your Status',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),
            _statusOption('idle', 'Idle', const Color(0xFF00c853),
                'Available and ready for alerts'),
            const SizedBox(height: 12),
            _statusOption('busy', 'Busy', const Color(0xFFf59e0b),
                'Occupied — cannot accept alerts'),
            const SizedBox(height: 12),
            _statusOption('off_duty', 'Off Duty', const Color(0xFF64748b),
                'Not available for dispatch'),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _statusOption(
      String value, String label, Color color, String subtitle) {
    final selected = _currentStatus == value;
    return GestureDetector(
      onTap: () {
        _setResponderStatus(value);
        Navigator.pop(context);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.15)
              : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? color : Colors.white.withOpacity(0.08),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(children: [
          Container(
            width: 10,
            height: 10,
            decoration:
                BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: TextStyle(
                        color: selected ? color : Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15)),
                Text(subtitle,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.4),
                        fontSize: 12)),
              ],
            ),
          ),
          if (selected)
            Icon(Icons.check_circle_rounded, color: color, size: 20),
        ]),
      ),
    );
  }

  Color _statusColor() {
    if (_currentStatus == 'idle') return const Color(0xFF00c853);
    if (_currentStatus == 'busy') return const Color(0xFFf59e0b);
    return const Color(0xFF64748b);
  }

  String _statusLabel() {
    if (_currentStatus == 'idle') return 'Idle';
    if (_currentStatus == 'busy') return 'Busy';
    return 'Off Duty';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020008),
      body: Stack(children: [
        // Aurora background
        Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(-0.3, -0.7),
              radius: 1.2,
              colors: [Color(0xFF1a0533), Color(0xFF020008)],
            ),
          ),
        ),
        Positioned(
          left: -60, top: -40,
          child: Container(
            width: 300, height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [
                const Color(0xFF7c3aed).withOpacity(0.35),
                Colors.transparent,
              ]),
            ),
          ),
        ),
        Positioned(
          right: -40, top: 200,
          child: Container(
            width: 220, height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [
                const Color(0xFF06b6d4).withOpacity(0.2),
                Colors.transparent,
              ]),
            ),
          ),
        ),

        // Main content
        SafeArea(
          child: Column(children: [
            // App bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
              child: Row(children: [
                // Logo
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF0a0015).withOpacity(0.8),
                    border: Border.all(
                        color: const Color(0xFFf43f5e).withOpacity(0.5),
                        width: 1),
                  ),
                  child: CustomPaint(painter: _MiniCrossPainter()),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('MediLink',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 17,
                            fontWeight: FontWeight.w700)),
                    Text('RESPONDER',
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.4),
                            fontSize: 9,
                            letterSpacing: 1.5)),
                  ],
                ),
                const Spacer(),
                // Status pill
                GestureDetector(
                  onTap: _showStatusPicker,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      color: _statusColor().withOpacity(0.15),
                      border: Border.all(
                          color: _statusColor().withOpacity(0.4),
                          width: 1),
                    ),
                    child: Row(children: [
                      Container(
                          width: 7, height: 7,
                          decoration: BoxDecoration(
                              color: _statusColor(),
                              shape: BoxShape.circle)),
                      const SizedBox(width: 6),
                      Text(_statusLabel(),
                          style: TextStyle(
                              color: _statusColor(),
                              fontSize: 12,
                              fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
                const SizedBox(width: 8),
                // Logout
                GestureDetector(
                  onTap: () => FirebaseAuth.instance.signOut(),
                  child: Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.06),
                      border: Border.all(
                          color: Colors.white.withOpacity(0.1), width: 1),
                    ),
                    child: Icon(Icons.logout_rounded,
                        color: Colors.white.withOpacity(0.5), size: 16),
                  ),
                ),
              ]),
            ),

            const SizedBox(height: 20),

            // Divider
            Container(
              height: 1,
              margin: const EdgeInsets.symmetric(horizontal: 20),
              color: Colors.white.withOpacity(0.07),
            ),

            const SizedBox(height: 16),

            // Section label
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(children: [
                Text('INCOMING ALERTS',
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2)),
              ]),
            ),

            const SizedBox(height: 12),

            // Alerts list
            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                // ── IMPORTANT: Composite index required ──────────────────
                // This query filters on two fields (assignedTo + status),
                // which Firestore requires a composite index for.
                // If missing, the query throws a runtime exception with a
                // link in the Flutter logs to create it automatically.
                //
                // Create manually at:
                // https://console.firebase.google.com/project/medilink-responder/firestore/indexes
                //
                // Collection: alerts
                // Fields:     assignedTo  Ascending
                //             status      Ascending
                // ──────────────────────────────────────────────────────────
                stream: FirebaseFirestore.instance
                    .collection('alerts')
                    .where('assignedTo', isEqualTo: FirebaseAuth.instance.currentUser!.uid)
                    .where('status', whereIn: ['sent', 'accepted'])
                    .snapshots(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState ==
                      ConnectionState.waiting) {
                    return const Center(
                        child: CircularProgressIndicator(
                            color: Color(0xFF7c3aed)));
                  }
                  if (!snapshot.hasData ||
                      snapshot.data!.docs.isEmpty) {
                    return Center(
                      child: Container(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 24),
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          color: Colors.white.withOpacity(0.04),
                          border: Border.all(
                              color: Colors.white.withOpacity(0.07),
                              width: 1),
                        ),
                        child: Column(children: [
                          Icon(Icons.shield_outlined,
                              color: Colors.white.withOpacity(0.2),
                              size: 40),
                          const SizedBox(height: 12),
                          Text('No pending alerts',
                              style: TextStyle(
                                  color: Colors.white.withOpacity(0.4),
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('Stay on standby',
                              style: TextStyle(
                                  color: Colors.white.withOpacity(0.2),
                                  fontSize: 13)),
                        ]),
                      ),
                    );
                  }

                  final alerts = snapshot.data!.docs;
                  return ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: alerts.length,
                    itemBuilder: (context, index) {
                      final data = alerts[index].data()
                          as Map<String, dynamic>;
                      final docId = alerts[index].id;
                      return _AlertCard(
                        data: data,
                        docId: docId,
                        geocode: _geocode,
                        onUpdateStatus: _updateStatus,
                      );
                    },
                  );
                },
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  Future<void> _updateStatus(String docId, String status) async {
    await FirebaseFirestore.instance
        .collection('alerts')
        .doc(docId)
        .update({'status': status});

    // Mirror alert acceptance/resolution to the responders collection
    if (status == 'accepted') {
      await LocationService.updateStatus('busy');
    } else if (status == 'resolved' || status == 'declined') {
      await LocationService.updateStatus('idle');
    }
  }
}

// ── Alert Card Widget
class _AlertCard extends StatefulWidget {
  final Map<String, dynamic> data;
  final String docId;
  final Future<LatLng?> Function(String) geocode;
  final Future<void> Function(String, String) onUpdateStatus;

  const _AlertCard({
    required this.data,
    required this.docId,
    required this.geocode,
    required this.onUpdateStatus,
  });

  @override
  State<_AlertCard> createState() => _AlertCardState();
}

class _AlertCardState extends State<_AlertCard> {
  LatLng? _coords;
  bool _loadingMap = false;

  @override
  void initState() {
    super.initState();
    if (widget.data['status'] == 'accepted') {
      _loadMap();
    }
  }

  Future<void> _loadMap() async {
    if (widget.data['location'] == null) return;
    setState(() => _loadingMap = true);
    final coords = await widget.geocode(widget.data['location']);
    if (mounted) setState(() {
      _coords = coords;
      _loadingMap = false;
    });
  }

  Future<void> _openGoogleMaps(String location) async {
    final encoded = Uri.encodeComponent(location);
    final googleMapsUrl = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$encoded'
    );
    if (await canLaunchUrl(googleMapsUrl)) {
      await launchUrl(
        googleMapsUrl,
        mode: LaunchMode.externalApplication,
      );
    }
  }

  Color get _accentColor {
    final status = widget.data['status'];
    if (status == 'accepted') return const Color(0xFF3b82f6);
    final type = (widget.data['type'] ?? '').toLowerCase();
    if (type == 'fire') return const Color(0xFFf43f5e);
    if (type == 'medical') return const Color(0xFF00c853);
    if (type == 'police') return const Color(0xFF3b82f6);
    return const Color(0xFFf59e0b);
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.data['status'] ?? 'pending';
    final type = widget.data['type'] ?? 'Unknown';
    final location = widget.data['location'] ?? 'Unknown location';
    final priority = widget.data['priority']?.toString() ?? '1';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: Colors.white.withOpacity(0.05),
        border: Border.all(
          color: _accentColor.withOpacity(0.35),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left accent bar + content
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Accent bar
                Container(
                  width: 3,
                  decoration: BoxDecoration(
                    color: _accentColor,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      bottomLeft: Radius.circular(20),
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badges row
                        Row(children: [
                          _badge(type.toUpperCase(), _accentColor),
                          const SizedBox(width: 8),
                          _badge('P$priority', _priorityColor(priority)),
                          const Spacer(),
                          if (status == 'accepted')
                            _badge('✓ Accepted',
                                const Color(0xFF3b82f6)),
                          if (status == 'pending')
                            Container(
                              width: 8, height: 8,
                              decoration: const BoxDecoration(
                                color: Color(0xFFf43f5e),
                                shape: BoxShape.circle,
                              ),
                            ),
                        ]),

                        const SizedBox(height: 12),

                        // Location
                        Text(location,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w700)),

                        const SizedBox(height: 4),

                        Text('Code: ${widget.data['location'] ?? ""}',
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.35),
                                fontSize: 11)),

                        const SizedBox(height: 16),

                        // Buttons
                        if (status == 'pending')
                          Row(children: [
                            Expanded(
                              child: _gradientButton(
                                label: 'Accept',
                                colors: const [
                                  Color(0xFF00c853),
                                  Color(0xFF00e5ff)
                                ],
                                textColor: Colors.black,
                                onTap: () async {
                                  await widget.onUpdateStatus(
                                      widget.docId, 'accepted');
                                  _loadMap();
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _gradientButton(
                                label: 'Decline',
                                colors: const [
                                  Color(0xFFf43f5e),
                                  Color(0xFF7c3aed)
                                ],
                                textColor: Colors.white,
                                onTap: () => widget.onUpdateStatus(
                                    widget.docId, 'declined'),
                              ),
                            ),
                          ]),

                        if (status == 'accepted')
                          _gradientButton(
                            label: 'Mark Resolved',
                            colors: const [
                              Color(0xFF3b82f6),
                              Color(0xFF7c3aed)
                            ],
                            textColor: Colors.white,
                            onTap: () => widget.onUpdateStatus(
                                widget.docId, 'resolved'),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Map section — shown when accepted
          if (status == 'accepted') ...[
            Container(
              height: 1,
              color: Colors.white.withOpacity(0.07),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: GestureDetector(
                onTap: () => _openGoogleMaps(widget.data['location'] ?? ''),
                child: Container(
                  width: double.infinity,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: const Color(0xFF1a1a2e),
                    border: Border.all(
                      color: const Color(0xFF3b82f6).withOpacity(0.4),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.directions,
                        color: const Color(0xFF3b82f6),
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Get Directions in Google Maps',
                        style: TextStyle(
                          color: const Color(0xFF3b82f6),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(20),
                bottomRight: Radius.circular(20),
              ),
              child: SizedBox(
                height: 180,
                child: _loadingMap
                    ? Container(
                        color: const Color(0xFF0d0020),
                        child: const Center(
                          child: CircularProgressIndicator(
                              color: Color(0xFF3b82f6)),
                        ),
                      )
                    : _coords == null
                        ? Container(
                            color: const Color(0xFF0d0020),
                            child: Center(
                              child: Text('Map unavailable',
                                  style: TextStyle(
                                      color:
                                          Colors.white.withOpacity(0.3),
                                      fontSize: 13)),
                            ),
                          )
                        : FlutterMap(
                            options: MapOptions(
                              initialCenter: _coords!,
                              initialZoom: 15,
                            ),
                            children: [
                              TileLayer(
                                urlTemplate:
                                    'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
                                subdomains: const ['a', 'b', 'c', 'd'],
                                userAgentPackageName:
                                    'com.example.medilink_responder',
                              ),
                              MarkerLayer(markers: [
                                Marker(
                                  point: _coords!,
                                  width: 40,
                                  height: 40,
                                  child: const Icon(
                                    Icons.location_pin,
                                    color: Color(0xFFf43f5e),
                                    size: 40,
                                  ),
                                ),
                              ]),
                            ],
                          ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _badge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        color: color.withOpacity(0.15),
        border: Border.all(color: color.withOpacity(0.4), width: 0.8),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w700)),
    );
  }

  Widget _gradientButton({
    required String label,
    required List<Color> colors,
    required Color textColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 42,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: LinearGradient(colors: colors),
        ),
        child: Center(
          child: Text(label,
              style: TextStyle(
                  color: textColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }

  Color _priorityColor(String p) {
    if (p == '3') return const Color(0xFFf43f5e);
    if (p == '2') return const Color(0xFFf59e0b);
    return const Color(0xFF94a3b8);
  }
}

// ── Mini cross painter for app bar logo
class _MiniCrossPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFf43f5e), Color(0xFF22d3ee)],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..style = PaintingStyle.fill;

    final w = size.width * 0.22;
    final r = Radius.circular(w / 2);

    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH((size.width - w) / 2, size.height * 0.18,
            w, size.height * 0.64),
        r,
      ),
      paint,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.18, (size.height - w) / 2,
            size.width * 0.64, w),
        r,
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(_MiniCrossPainter old) => false;
}
