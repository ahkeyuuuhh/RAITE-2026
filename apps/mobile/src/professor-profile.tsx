import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from './context';
import { Icon, colors, fontStack } from './ui';
import { fetchMe, updateProfile, uploadProfilePhoto } from './api';
import type { Profile } from './types';

const ACCENT = '#811212';
const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

export function ProfessorProfileScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  const { profile: appProfile, refresh, revision } = useApp();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile>(appProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name || '');
  const [editSchool, setEditSchool] = useState(profile.school_name || '');
  const [editFacultyId, setEditFacultyId] = useState(
    profile.faculty_id || profile.employee_number || '',
  );
  const [editDepartment, setEditDepartment] = useState(profile.department || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [failedAvatarUrl, setFailedAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;
    setProfile((current) => (current.id === appProfile.id ? current : appProfile));
    fetchMe()
      .then((nextProfile) => {
        if (active && nextProfile) setProfile(nextProfile);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [revision, appProfile]);

  const initials =
    profile.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'P';
  const schoolDisplay = profile.school_name || 'Not set';
  const facultyIdDisplay = profile.faculty_id || profile.employee_number || 'Not set';
  const departmentDisplay = profile.department || 'Not set';
  const emailDisplay = profile.email || 'Not set';
  const avatarUrl = profile.avatar_url || '';
  const showAvatar = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);

  const handleOpenEdit = () => {
    setEditName(profile.name || '');
    setEditSchool(profile.school_name || '');
    setEditFacultyId(profile.faculty_id || profile.employee_number || '');
    setEditDepartment(profile.department || '');
    setSaveError('');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateProfile({
        name: editName.trim(),
        school: editSchool.trim() || undefined,
        facultyId: editFacultyId.trim() || undefined,
        department: editDepartment.trim() || undefined,
      });
      setProfile(updated);
      refresh();
      setEditOpen(false);
    } catch (error) {
      setSaveError((error as Error).message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChoosePhoto = async () => {
    if (photoUploading) return;
    setPhotoError('');
    try {
      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.72,
        base64: true,
        selectionLimit: 1,
      });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      const mimeType = (asset.mimeType || 'image/jpeg').split(';')[0].trim().toLowerCase();
      if (!asset.base64 || !AVATAR_TYPES.has(mimeType)) {
        setPhotoError('Choose a JPG, PNG, WebP, or HEIF image.');
        return;
      }

      setPhotoUploading(true);
      try {
        const updated = await uploadProfilePhoto(asset.base64, mimeType);
        setProfile(updated);
        setFailedAvatarUrl('');
        refresh();
      } catch (error) {
        const message = (error as Error).message;
        setPhotoError(
          message.includes('Network') || message.includes('fetch')
            ? 'Could not reach the server. Check your connection and try again.'
            : message || 'Could not upload your photo. Please try again.',
        );
      } finally {
        setPhotoUploading(false);
      }
    } catch (error) {
      setPhotoError(
        (error as Error).message || 'Could not open the photo library. Please try again.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Text style={styles.pageSubtitle}>Your professional identity</Text>
      </View>

      <View style={styles.identityBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={photoUploading ? 'Uploading profile photo' : 'Change profile photo'}
          accessibilityHint="Opens the photo library to choose a profile photo"
          disabled={photoUploading}
          onPress={handleChoosePhoto}
          style={({ pressed }) => [
            styles.avatarButton,
            pressed && !photoUploading && { opacity: 0.8 },
          ]}
        >
          <View style={styles.avatar}>
            {showAvatar ? (
              <Image
                source={{ uri: avatarUrl }}
                onError={() => setFailedAvatarUrl(avatarUrl)}
                resizeMode="cover"
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
            {photoUploading && (
              <View style={styles.avatarLoading}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            )}
          </View>
          {!photoUploading && (
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={14} color={ACCENT} />
            </View>
          )}
        </Pressable>

        <View style={styles.identityDetails}>
          <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
            {profile.name || 'Professor'}
          </Text>
          <Text style={styles.roleText}>Professor</Text>
          <Text style={styles.emailText} numberOfLines={2} ellipsizeMode="middle">
            {emailDisplay}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={handleOpenEdit}
            style={({ pressed }) => [styles.editAction, pressed && { opacity: 0.65 }]}
          >
            <Icon name="pencil" size={13} color={ACCENT} />
            <Text style={styles.editActionText}>Edit profile</Text>
          </Pressable>
        </View>
      </View>

      {photoError ? (
        <View accessibilityRole="alert" style={styles.photoError}>
          <Text style={styles.photoErrorText}>{photoError}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Faculty Information</Text>
        <View style={styles.rows}>
          <ProfileRow label="School / Institution" value={schoolDisplay} />
          <ProfileRow label="Faculty / Employee ID" value={facultyIdDisplay} />
          <ProfileRow label="Department" value={departmentDisplay} last />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.rows}>
          <ProfileRow label="Email" value={emailDisplay} />
          <ProfileRow label="Role" value="Professor" last />
        </View>
      </View>

      <View style={styles.logoutWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => onLogout()}
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.68 }]}
        >
          <Icon name="arrow.right" size={15} color={ACCENT} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={() => !saving && setEditOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 14) }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close edit profile"
            disabled={saving}
            style={styles.modalBackdrop}
            onPress={() => setEditOpen(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeading}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>Update your academic details.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                disabled={saving}
                onPress={() => setEditOpen(false)}
                style={({ pressed }) => [styles.modalCloseButton, pressed && { opacity: 0.6 }]}
              >
                <Icon name="xmark" size={16} color={colors.muted} />
              </Pressable>
            </View>

            {saveError ? (
              <View accessibilityRole="alert" style={styles.saveError}>
                <Text style={styles.saveErrorText}>{saveError}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              <ProfileInput
                label="Full Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Dr. Julian Vance"
              />
              <ProfileInput
                label="School / Institution"
                value={editSchool}
                onChangeText={setEditSchool}
                placeholder="e.g. Lyceum of Subic Bay"
              />
              <ProfileInput
                label="Faculty / Employee ID"
                value={editFacultyId}
                onChangeText={setEditFacultyId}
                placeholder="e.g. 2023010"
              />
              <ProfileInput
                label="Department"
                value={editDepartment}
                onChangeText={setEditDepartment}
                placeholder="e.g. Department of Computer Science"
              />
              <Text style={styles.readOnlyRole}>Role · Professor</Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setEditOpen(false)}
                style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={handleSaveEdit}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && !saving && { opacity: 0.85 },
                  saving && { opacity: 0.6 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Save changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ProfileRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.profileRow, last && styles.profileRowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function ProfileInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        autoCapitalize={
          label === 'Full Name' || label === 'School / Institution' ? 'words' : 'sentences'
        }
        returnKeyType="next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 23,
    paddingBottom: 44,
  },
  header: { gap: 2, marginBottom: 1 },
  pageTitle: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '700',
    letterSpacing: -0.9,
  },
  pageSubtitle: { color: colors.muted, fontFamily: fontStack, fontSize: 14, lineHeight: 19 },
  identityBlock: { flexDirection: 'row', alignItems: 'center', gap: 17, paddingVertical: 2 },
  avatarButton: { width: 84, height: 84, position: 'relative', flexShrink: 0 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#EFEFED',
    borderWidth: 1,
    borderColor: '#E3E3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28,28,30,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityDetails: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  roleText: {
    color: '#53545A',
    fontFamily: fontStack,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  emailText: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.muted,
    fontFamily: fontStack,
    fontSize: 13,
    lineHeight: 18,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 5,
    paddingVertical: 3,
  },
  editActionText: {
    color: ACCENT,
    fontFamily: fontStack,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  photoError: {
    marginTop: -13,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#FFF4F3',
  },
  photoErrorText: { color: '#842B2B', fontFamily: fontStack, fontSize: 13, lineHeight: 18 },
  section: { gap: 8 },
  sectionTitle: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#DCDCD9' },
  profileRow: {
    paddingVertical: 12,
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCDCD9',
  },
  profileRowLast: { borderBottomWidth: 0 },
  rowLabel: {
    color: colors.muted,
    fontFamily: fontStack,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  rowValue: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    flexShrink: 1,
  },
  logoutWrap: {
    marginTop: 1,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E2DF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  logoutText: {
    color: ACCENT,
    fontFamily: fontStack,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18,18,20,0.35)' },
  modalCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingTop: 21,
    paddingHorizontal: 21,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 15,
  },
  modalHeading: { flex: 1, minWidth: 0, gap: 3 },
  modalTitle: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  modalSubtitle: { color: colors.muted, fontFamily: fontStack, fontSize: 13, lineHeight: 18 },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveError: { padding: 10, marginBottom: 10, borderRadius: 10, backgroundColor: '#FFF4F3' },
  saveErrorText: { color: '#842B2B', fontFamily: fontStack, fontSize: 13, lineHeight: 18 },
  modalBody: { flexShrink: 1, marginBottom: 10 },
  modalBodyContent: { paddingBottom: 5 },
  inputGroup: { marginBottom: 13, gap: 6 },
  inputLabel: {
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: '#FAFAF9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
    fontFamily: fontStack,
    fontSize: 14,
  },
  readOnlyRole: {
    color: colors.muted,
    fontFamily: fontStack,
    fontSize: 12,
    lineHeight: 17,
    paddingVertical: 3,
  },
  modalFooter: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  cancelButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 11,
    backgroundColor: '#F2F2F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.ink, fontFamily: fontStack, fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 1.5,
    minHeight: 45,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFFFFF', fontFamily: fontStack, fontSize: 14, fontWeight: '600' },
});
