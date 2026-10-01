import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, colors } from './ui';
import type { Config, Profile } from './types';
import { loginAccount, registerAccount } from './api';

export type UserRole = 'student' | 'teacher';

type FlowScreen = 'login' | 'register_account' | 'role_select' | 'onboarding';

const ACCENT = '#811212';

export function AuthFlow({
  error: serverError,
  onSignedIn,
}: {
  config?: Config;
  error: string;
  retry: () => void;
  onSignedIn: (p: Profile) => void;
}) {
  const [currentScreen, setCurrentScreen] = useState<FlowScreen>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState(serverError || '');

  // Register - Account details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountError, setAccountError] = useState('');

  // Register - Role selection
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  // Register - Onboarding fields
  const [school, setSchool] = useState('University of the Philippines Diliman');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('BS Computer Science');
  const [yearLevel, setYearLevel] = useState('2nd Year');
  const [facultyId, setFacultyId] = useState('');
  const [department, setDepartment] = useState('Department of Computer Science');
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');

  // =========================================================================
  // ACTIONS
  // =========================================================================

  const handleLogin = async (emailOverride?: string, passwordOverride?: string) => {
    const emailToUse = (emailOverride ?? loginEmail).trim();
    const passwordToUse = passwordOverride ?? loginPassword;

    setLoginError('');
    if (!emailToUse) {
      setLoginError('Email is required.');
      return;
    }
    if (!passwordToUse) {
      setLoginError('Password is required.');
      return;
    }

    setLoginBusy(true);
    try {
      const res = await loginAccount({ email: emailToUse, password: passwordToUse });
      if (res.ok && res.profile) {
        onSignedIn(res.profile);
      } else {
        setLoginError('Could not verify your credentials. Please try again.');
      }
    } catch (e) {
      setLoginError((e as Error).message || 'Invalid email or password.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleContinueAccount = () => {
    setAccountError('');
    if (!firstName.trim()) {
      setAccountError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setAccountError('Last name is required.');
      return;
    }
    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setAccountError('Please enter a valid email address.');
      return;
    }
    if (registerPassword.length < 6) {
      setAccountError('Password must be at least 6 characters.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setAccountError('Passwords do not match.');
      return;
    }

    setCurrentScreen('role_select');
  };

  const handleFinishOnboarding = async () => {
    setOnboardingError('');
    if (!school.trim()) {
      setOnboardingError('School is required.');
      return;
    }

    setOnboardingBusy(true);
    try {
      const res = await registerAccount({
        email: registerEmail.trim(),
        password: registerPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: selectedRole,
        school: school.trim(),
        studentId: studentId.trim(),
        course: course.trim(),
        yearLevel: yearLevel.trim(),
        facultyId: facultyId.trim(),
        department: department.trim(),
      });

      if (res.ok && res.profile) {
        onSignedIn(res.profile);
      } else {
        setOnboardingError('Could not complete registration. Please try again.');
      }
    } catch (e) {
      setOnboardingError((e as Error).message || 'Registration failed.');
    } finally {
      setOnboardingBusy(false);
    }
  };

  // Demo shortcut login
  const handleQuickDemo = (role: UserRole) => {
    const email = role === 'teacher' ? 'teacher@classassist.demo' : 'student@classassist.demo';
    const pwd = 'ClassAssist-demo-2026!';
    setLoginEmail(email);
    setLoginPassword(pwd);
    handleLogin(email, pwd);
  };

  // =========================================================================
  // SUB-RENDERERS
  // =========================================================================

  const renderBrandHeader = (showBack = false, onBack?: () => void) => (
    <View style={styles.brandRow}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
        >
          <Icon name="arrow.left" size={20} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.brand}>
          <Icon name="book.closed" size={26} color={ACCENT} />
          <Text style={styles.brandName}>Aider</Text>
        </View>
      )}

      {showBack && (
        <View style={styles.brand}>
          <Icon name="book.closed" size={22} color={ACCENT} />
          <Text style={styles.brandNameSmall}>Aider</Text>
        </View>
      )}
    </View>
  );

  // -------------------------------------------------------------------------
  // SCREEN 1: LOGIN
  // -------------------------------------------------------------------------
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderBrandHeader()}

            <View style={styles.headerBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue to your classroom.</Text>
            </View>

            {loginError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  value={loginEmail}
                  onChangeText={(val) => {
                    setLoginEmail(val);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="name@school.edu"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    accessibilityLabel="Password"
                    value={loginPassword}
                    onChangeText={(val) => {
                      setLoginPassword(val);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showLoginPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={() => handleLogin()}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showLoginPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                    style={styles.eyeButton}
                  >
                    <Icon
                      name={showLoginPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                disabled={loginBusy}
                onPress={() => handleLogin()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.85 },
                  loginBusy && { opacity: 0.6 },
                ]}
              >
                {loginBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign in</Text>
                )}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don't have an account?</Text>
                <Pressable
                  onPress={() => {
                    setLoginError('');
                    setCurrentScreen('register_account');
                  }}
                >
                  <Text style={styles.switchLink}> Create account</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Demo Shortcuts for Hackathon Evaluation */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>Quick Demo Accounts</Text>
              <View style={styles.demoRow}>
                <Pressable
                  disabled={loginBusy}
                  onPress={() => handleQuickDemo('teacher')}
                  style={({ pressed }) => [styles.demoChip, pressed && { opacity: 0.7 }]}
                >
                  <Icon name="book.closed" size={16} color={ACCENT} />
                  <Text style={styles.demoChipText}>Professor Demo</Text>
                </Pressable>
                <Pressable
                  disabled={loginBusy}
                  onPress={() => handleQuickDemo('student')}
                  style={({ pressed }) => [styles.demoChip, pressed && { opacity: 0.7 }]}
                >
                  <Icon name="graduationcap.fill" size={16} color={colors.ink} />
                  <Text style={styles.demoChipText}>Student Demo</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // SCREEN 2: CREATE ACCOUNT
  // -------------------------------------------------------------------------
  if (currentScreen === 'register_account') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderBrandHeader(true, () => setCurrentScreen('login'))}

            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Step 1 of 3</Text>
            </View>

            <View style={styles.headerBlock}>
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Set up Aider for your classes.</Text>
            </View>

            {accountError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{accountError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>First name</Text>
                  <TextInput
                    accessibilityLabel="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Juan"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="words"
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Last name</Text>
                  <TextInput
                    accessibilityLabel="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dela Cruz"
                    autoCapitalize="words"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  accessibilityLabel="Email address"
                  value={registerEmail}
                  onChangeText={setRegisterEmail}
                  placeholder="name@school.edu"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    accessibilityLabel="Password"
                    value={registerPassword}
                    onChangeText={setRegisterPassword}
                    placeholder="At least 6 characters"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showRegisterPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowRegisterPassword(!showRegisterPassword)}
                    style={styles.eyeButton}
                  >
                    <Icon
                      name={showRegisterPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm password</Text>
                <View style={styles.passwordWrap}>
                  <TextInput
                    accessibilityLabel="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.muted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    <Icon
                      name={showConfirmPassword ? 'eye.slash' : 'eye'}
                      size={20}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                onPress={handleContinueAccount}
                style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account?</Text>
                <Pressable onPress={() => setCurrentScreen('login')}>
                  <Text style={styles.switchLink}> Sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // SCREEN 3: ROLE SELECTION
  // -------------------------------------------------------------------------
  if (currentScreen === 'role_select') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderBrandHeader(true, () => setCurrentScreen('register_account'))}

          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 2 of 3</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>How will you use Aider?</Text>
            <Text style={styles.subtitle}>Choose your workspace role to personalize your experience.</Text>
          </View>

          <View style={styles.cardsStack}>
            {/* Student Card */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Student role"
              onPress={() => setSelectedRole('student')}
              style={({ pressed }) => [
                styles.roleCard,
                selectedRole === 'student' && styles.roleCardActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.roleCardTop}>
                <View
                  style={[
                    styles.roleIconBox,
                    selectedRole === 'student' && styles.roleIconBoxActive,
                  ]}
                >
                  <Icon
                    name="graduationcap.fill"
                    size={24}
                    color={selectedRole === 'student' ? ACCENT : colors.ink}
                  />
                </View>
                {selectedRole === 'student' && (
                  <View style={styles.selectedCheck}>
                    <Icon name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.roleTitle}>Student</Text>
              <Text style={styles.roleDesc}>
                Join classes, review lessons, and stay on track.
              </Text>
            </Pressable>

            {/* Professor Card */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Professor role"
              onPress={() => setSelectedRole('teacher')}
              style={({ pressed }) => [
                styles.roleCard,
                selectedRole === 'teacher' && styles.roleCardActive,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.roleCardTop}>
                <View
                  style={[
                    styles.roleIconBox,
                    selectedRole === 'teacher' && styles.roleIconBoxActive,
                  ]}
                >
                  <Icon
                    name="book.closed"
                    size={24}
                    color={selectedRole === 'teacher' ? ACCENT : colors.ink}
                  />
                </View>
                {selectedRole === 'teacher' && (
                  <View style={styles.selectedCheck}>
                    <Icon name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text style={styles.roleTitle}>Professor</Text>
              <Text style={styles.roleDesc}>
                Manage classes, classwork, and students.
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 24 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              onPress={() => setCurrentScreen('onboarding')}
              style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // SCREEN 4A & 4B: ONBOARDING (ROLE SPECIFIC)
  // -------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderBrandHeader(true, () => setCurrentScreen('role_select'))}

          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 3 of 3</Text>
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>
              {selectedRole === 'student'
                ? 'Set up your student profile'
                : 'Set up your professor profile'}
            </Text>
            <Text style={styles.subtitle}>
              {selectedRole === 'student'
                ? 'Provide your academic details to connect with your classes.'
                : 'Provide your faculty details to organize your classes.'}
            </Text>
          </View>

          {onboardingError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{onboardingError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>School / Institution</Text>
              <TextInput
                accessibilityLabel="School"
                value={school}
                onChangeText={setSchool}
                placeholder="University of the Philippines Diliman"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>

            {selectedRole === 'student' ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Student ID Number</Text>
                  <TextInput
                    accessibilityLabel="Student ID"
                    value={studentId}
                    onChangeText={setStudentId}
                    placeholder="e.g. 2024-12345"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Program / Course</Text>
                  <TextInput
                    accessibilityLabel="Course"
                    value={course}
                    onChangeText={setCourse}
                    placeholder="e.g. BS Computer Science"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Year Level / Grade</Text>
                  <TextInput
                    accessibilityLabel="Year level"
                    value={yearLevel}
                    onChangeText={setYearLevel}
                    placeholder="e.g. 2nd Year, Grade 10"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Faculty / Employee ID</Text>
                  <TextInput
                    accessibilityLabel="Faculty ID"
                    value={facultyId}
                    onChangeText={setFacultyId}
                    placeholder="e.g. FAC-2026-001"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="characters"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <TextInput
                    accessibilityLabel="Department"
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="e.g. Department of Computer Science"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                </View>
              </>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter Aider"
              disabled={onboardingBusy}
              onPress={handleFinishOnboarding}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && { opacity: 0.85 },
                onboardingBusy && { opacity: 0.6 },
              ]}
            >
              {onboardingBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Enter Aider</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================================
// STYLES (Matching Professor Classroom Visual Philosophy)
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FA',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 8,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandName: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  brandNameSmall: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    marginTop: 8,
    marginBottom: 2,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: ACCENT,
  },
  headerBlock: {
    marginTop: 10,
    marginBottom: 24,
    gap: 5,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.0,
    color: colors.ink,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  errorBanner: {
    backgroundColor: '#FCECEB',
    borderWidth: 1,
    borderColor: '#F7C2C0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
  },
  errorText: {
    color: '#9F2925',
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  input: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.ink,
  },
  passwordWrap: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  switchText: {
    fontSize: 14,
    color: colors.muted,
  },
  switchLink: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
  },
  demoSection: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 12,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted,
    textAlign: 'center',
  },
  demoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
  },
  demoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  cardsStack: {
    gap: 14,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 20,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  roleCardActive: {
    borderColor: ACCENT,
    backgroundColor: '#FDF8F8',
  },
  roleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: {
    backgroundColor: '#F8E9E9',
  },
  selectedCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  roleDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
