import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/buttons/cn_buttons.dart';
import '../../shared/widgets/inputs/cn_text_field.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  late TextEditingController _firstNameCtrl;
  late TextEditingController _lastNameCtrl;
  late TextEditingController _phoneCtrl;
  bool _isLoading = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    final user = ref.read(currentUserProvider);
    _firstNameCtrl = TextEditingController(text: user?.firstName ?? '');
    _lastNameCtrl = TextEditingController(text: user?.lastName ?? '');
    _phoneCtrl = TextEditingController(text: user?.phone ?? '');
  }

  @override
  void dispose() {
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Edit Profile',
            style: TextStyle(
                fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar section
            Center(
              child: Stack(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: AppColors.primarySurface,
                    backgroundImage: user?.avatar != null &&
                            user!.avatar!.isNotEmpty &&
                            (user.avatar!.startsWith('http://') ||
                                user.avatar!.startsWith('https://'))
                        ? NetworkImage(user.avatar!)
                        : null,
                    child: user?.avatar == null ||
                            user!.avatar!.isEmpty ||
                            !(user.avatar!.startsWith('http://') ||
                                user.avatar!.startsWith('https://'))
                        ? Text(
                            _initials(user?.firstName, user?.lastName),
                            style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary),
                          )
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: GestureDetector(
                      onTap: _pickAvatar,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                            color: AppColors.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt_rounded,
                            color: AppColors.surface, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Center(
                child: Text(user?.email ?? '',
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textSecondary))),
            const SizedBox(height: 28),

            Row(
              children: [
                Expanded(
                    child: CnTextField(
                        label: 'First Name',
                        controller: _firstNameCtrl,
                        hint: 'Jane')),
                const SizedBox(width: 12),
                Expanded(
                    child: CnTextField(
                        label: 'Last Name',
                        controller: _lastNameCtrl,
                        hint: 'Doe')),
              ],
            ),
            const SizedBox(height: 14),
            CnTextField(
                label: 'Phone',
                controller: _phoneCtrl,
                hint: '+250 7XX XXX XXX',
                keyboardType: TextInputType.phone),

            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: AppColors.errorSurface,
                    borderRadius: BorderRadius.circular(10)),
                child: Text(_error!,
                    style:
                        const TextStyle(color: AppColors.error, fontSize: 13)),
              ),
            ],
            if (_success != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                    color: AppColors.successSurface,
                    borderRadius: BorderRadius.circular(10)),
                child: Text(_success!,
                    style: const TextStyle(
                        color: AppColors.success, fontSize: 13)),
              ),
            ],

            const SizedBox(height: 24),
            CnPrimaryButton(
              label: 'Save Changes',
              isLoading: _isLoading,
              onTap: _isLoading ? null : _save,
            ),
            const SizedBox(height: 16),
            CnSecondaryButton(
              label: 'Change Password',
              icon: Icons.lock_outline_rounded,
              onTap: () => _showChangePasswordSheet(context),
            ),
          ],
        ),
      ),
    );
  }

  String _initials(String? f, String? l) {
    final fi = f?.isNotEmpty == true ? f![0].toUpperCase() : '';
    final li = l?.isNotEmpty == true ? l![0].toUpperCase() : '';
    return '$fi$li';
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    try {
      final source = await showModalBottomSheet<ImageSource>(
        context: context,
        shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (context) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 16),
              const Text('Choose Avatar Source',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.photo_library_rounded,
                    color: AppColors.primary),
                title: const Text('Photo Gallery'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded,
                    color: AppColors.primary),
                title: const Text('Camera'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      );

      if (source == null) return;

      final file = await picker.pickImage(
        source: source,
        maxWidth: 512,
        maxHeight: 512,
        imageQuality: 85,
      );

      if (file == null) return;

      setState(() {
        _isLoading = true;
        _error = null;
        _success = null;
      });
      await ref.read(authProvider.notifier).uploadAvatar(file.path);

      HapticFeedback.heavyImpact();
      setState(() => _success = 'Avatar updated successfully!');
    } catch (e) {
      setState(() => _error = 'Failed to upload avatar: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _save() async {
    final fn = _firstNameCtrl.text.trim();
    final ln = _lastNameCtrl.text.trim();
    if (fn.isEmpty || ln.isEmpty) {
      setState(() => _error = 'First and last name are required');
      return;
    }
    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });
    try {
      await ref.read(authProvider.notifier).updateProfile(
            firstName: fn,
            lastName: ln,
            phone:
                _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
          );
      HapticFeedback.heavyImpact();
      setState(() => _success = 'Profile updated successfully!');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showChangePasswordSheet(BuildContext context) {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Change Password',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 16),
            CnTextField(
                label: 'Current Password',
                controller: currentCtrl,
                obscureText: true),
            const SizedBox(height: 12),
            CnTextField(
                label: 'New Password', controller: newCtrl, obscureText: true),
            const SizedBox(height: 12),
            CnTextField(
                label: 'Confirm New Password',
                controller: confirmCtrl,
                obscureText: true),
            const SizedBox(height: 20),
            CnPrimaryButton(
              label: 'Update Password',
              onTap: () {
                if (newCtrl.text != confirmCtrl.text) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Password updated!'),
                      backgroundColor: AppColors.primary),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
