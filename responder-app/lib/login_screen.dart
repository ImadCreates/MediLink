import 'dart:math';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String _errorMessage = '';

  late AnimationController _orb1Controller;
  late AnimationController _orb2Controller;
  late AnimationController _orb3Controller;
  late AnimationController _logoController;

  late Animation<Offset> _orb1Anim;
  late Animation<Offset> _orb2Anim;
  late Animation<Offset> _orb3Anim;
  late Animation<double> _logoAnim;

  @override
  void initState() {
    super.initState();

    _orb1Controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat(reverse: true);

    _orb2Controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 11),
    )..repeat(reverse: true);

    _orb3Controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 9),
    )..repeat(reverse: true);

    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _orb1Anim = Tween<Offset>(
      begin: const Offset(-20, -20),
      end: const Offset(20, 30),
    ).animate(CurvedAnimation(parent: _orb1Controller, curve: Curves.easeInOut));

    _orb2Anim = Tween<Offset>(
      begin: const Offset(15, -15),
      end: const Offset(-25, 20),
    ).animate(CurvedAnimation(parent: _orb2Controller, curve: Curves.easeInOut));

    _orb3Anim = Tween<Offset>(
      begin: const Offset(-10, 10),
      end: const Offset(20, -20),
    ).animate(CurvedAnimation(parent: _orb3Controller, curve: Curves.easeInOut));

    _logoAnim = Tween<double>(begin: 0.7, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _orb1Controller.dispose();
    _orb2Controller.dispose();
    _orb3Controller.dispose();
    _logoController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text.trim(),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Login failed. Check your email and password.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Stack(
        children: [
          // ── Deep space background
          Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(-0.3, -0.5),
                radius: 1.4,
                colors: [Color(0xFF1a0533), Color(0xFF020008)],
              ),
            ),
          ),

          // ── Animated aurora orb 1 — purple
          AnimatedBuilder(
            animation: _orb1Anim,
            builder: (_, __) => Positioned(
              left: size.width * 0.3 + _orb1Anim.value.dx,
              top: size.height * 0.1 + _orb1Anim.value.dy,
              child: Container(
                width: 280,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF7c3aed).withOpacity(0.55),
                      const Color(0xFF7c3aed).withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Animated aurora orb 2 — cyan
          AnimatedBuilder(
            animation: _orb2Anim,
            builder: (_, __) => Positioned(
              left: size.width * 0.0 + _orb2Anim.value.dx,
              top: size.height * 0.55 + _orb2Anim.value.dy,
              child: Container(
                width: 220,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF06b6d4).withOpacity(0.38),
                      const Color(0xFF06b6d4).withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Animated aurora orb 3 — blue
          AnimatedBuilder(
            animation: _orb3Anim,
            builder: (_, __) => Positioned(
              right: size.width * 0.0 + _orb3Anim.value.dx,
              top: size.height * 0.35 + _orb3Anim.value.dy,
              child: Container(
                width: 200,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF3b82f6).withOpacity(0.3),
                      const Color(0xFF3b82f6).withOpacity(0.0),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Stars
          ..._buildStars(),

          // ── Main content
          SafeArea(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    const SizedBox(height: 60),

                    // ── Logo
                    AnimatedBuilder(
                      animation: _logoAnim,
                      builder: (_, __) => Container(
                        width: 92,
                        height: 92,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF0a0015).withOpacity(0.78),
                          border: Border.all(
                            color: Colors.transparent,
                            width: 0,
                          ),
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF0a0015), Color(0xFF0a0015)],
                          ),
                        ),
                        child: CustomPaint(
                          painter: _RingPainter(opacity: _logoAnim.value),
                          child: Center(
                            child: CustomPaint(
                              size: const Size(44, 44),
                              painter: _CrossPainter(),
                            ),
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // ── App name
                    const Text(
                      'MediLink',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.5,
                      ),
                    ),

                    const SizedBox(height: 6),

                    Text(
                      'EMERGENCY DISPATCH',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.45),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 2.5,
                      ),
                    ),

                    const SizedBox(height: 40),

                    // ── Glass card
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        color: Colors.white.withOpacity(0.07),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.15),
                          width: 1,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Email
                            _fieldLabel('EMAIL ADDRESS'),
                            const SizedBox(height: 8),
                            _glassField(
                              controller: _emailController,
                              hint: 'responder@medilink.ca',
                              obscure: false,
                              keyboardType: TextInputType.emailAddress,
                            ),

                            const SizedBox(height: 20),

                            // Password
                            _fieldLabel('PASSWORD'),
                            const SizedBox(height: 8),
                            _glassField(
                              controller: _passwordController,
                              hint: '••••••••',
                              obscure: true,
                            ),

                            const SizedBox(height: 12),

                            // Error
                            if (_errorMessage.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text(
                                  _errorMessage,
                                  style: const TextStyle(
                                    color: Color(0xFFf87171),
                                    fontSize: 13,
                                  ),
                                ),
                              ),

                            const SizedBox(height: 8),

                            // Sign in button
                            SizedBox(
                              width: double.infinity,
                              height: 54,
                              child: _isLoading
                                  ? const Center(
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                      ),
                                    )
                                  : DecoratedBox(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(16),
                                        gradient: const LinearGradient(
                                          colors: [
                                            Color(0xFF00c853),
                                            Color(0xFF00e5ff),
                                          ],
                                        ),
                                      ),
                                      child: ElevatedButton(
                                        onPressed: _login,
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.transparent,
                                          shadowColor: Colors.transparent,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(16),
                                          ),
                                        ),
                                        child: const Text(
                                          'Sign In',
                                          style: TextStyle(
                                            color: Colors.black,
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ),
                            ),

                            const SizedBox(height: 20),

                            Center(
                              child: Text(
                                'End-to-end encrypted',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.3),
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _fieldLabel(String label) {
    return Text(
      label,
      style: TextStyle(
        color: Colors.white.withOpacity(0.5),
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 1.0,
      ),
    );
  }

  Widget _glassField({
    required TextEditingController controller,
    required String hint,
    required bool obscure,
    TextInputType? keyboardType,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: Colors.white.withOpacity(0.07),
        border: Border.all(
          color: Colors.white.withOpacity(0.12),
          width: 1,
        ),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.white, fontSize: 15),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(
            color: Colors.white.withOpacity(0.25),
            fontSize: 15,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 20,
            vertical: 16,
          ),
        ),
      ),
    );
  }

  List<Widget> _buildStars() {
    final rng = Random(42);
    return List.generate(18, (i) {
      final x = rng.nextDouble();
      final y = rng.nextDouble() * 0.5;
      final r = rng.nextDouble() * 1.2 + 0.4;
      final op = rng.nextDouble() * 0.5 + 0.2;
      return Positioned(
        left: x * 380,
        top: y * 800,
        child: Container(
          width: r * 2,
          height: r * 2,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withOpacity(op),
          ),
        ),
      );
    });
  }
}

// ── Ring painter — animated glowing border on logo circle
class _RingPainter extends CustomPainter {
  final double opacity;
  _RingPainter({required this.opacity});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 1;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..shader = SweepGradient(
        colors: [
          const Color(0xFFf43f5e).withOpacity(opacity),
          const Color(0xFF22d3ee).withOpacity(opacity),
          const Color(0xFFf43f5e).withOpacity(opacity),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius));
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.opacity != opacity;
}

// ── Cross painter — medical cross with gradient
class _CrossPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gradient = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFFf43f5e), Color(0xFF22d3ee)],
    );

    final rect = Rect.fromLTWH(0, 0, size.width, size.height);
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.fill;

    final armW = size.width * 0.28;
    final rr = Radius.circular(armW / 2);

    // Vertical arm
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          (size.width - armW) / 2, 0, armW, size.height,
        ),
        rr,
      ),
      paint,
    );

    // Horizontal arm
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(
          0, (size.height - armW) / 2, size.width, armW,
        ),
        rr,
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(_CrossPainter old) => false;
}
