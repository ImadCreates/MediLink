class Alert{
  final String id;
  final String location;
  final String type;
  final String status;
  final DateTime createdAt;

  Alert({
    required this.id,
    required this.location,
    required this.type,
    required this.status,
    required this.createdAt,
  });

  Map<String, dynamic> toMap(){
    return {
      'id': id,
      'location': location,
      'type': type,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
    };
  }

} 