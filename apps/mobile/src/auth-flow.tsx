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
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Icon } from './ui';
import type { Config, Profile } from './types';
import { loginAccount, registerAccount } from './api';

export type UserRole = 'student';

type FlowScreen = 'login' | 'register_account' | 'onboarding';

const THEME = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryDeep: '#581C87',
  primaryLight: '#8B5CF6',
  primarySoft: '#F5F3FF',
  primaryBorder: '#DDD6FE',
  textDark: '#1E293B',
  textMuted: '#64748B',
  inputBorder: '#E2E8F0',
  inputBg: '#FFFFFF',
  placeholder: '#94A3B8',
};

const logoImage = require('../assets/logo.png');

export function AuthFlow({
  error: serverError,
  onSignedIn,
}: {
  config?: Config;
  error: string;
  retry: () => void;
  onSignedIn: (p: Profile) => void;
}) {
  const insets = useSafeAreaInsets();
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

  // Register - Onboarding fields (Student)
  const [school, setSchool] = useState('University of the Philippines Diliman');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('BS Computer Science');
  const [yearLevel, setYearLevel] = useState('2nd Year');
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
      setLoginError('Please enter your email or phone.');
      return;
    }
    if (!passwordToUse) {
      setLoginError('Please enter your password.');
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

    setCurrentScreen('onboarding');
  };

  const handleFinishOnboarding = async () => {
    setOnboardingError('');
    if (!school.trim()) {
      setOnboardingError('School / Institution is required.');
      return;
    }

    setOnboardingBusy(true);
    try {
      const res = await registerAccount({
        email: registerEmail.trim(),
        password: registerPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'student',
        school: school.trim(),
        studentId: studentId.trim(),
        course: course.trim(),
        yearLevel: yearLevel.trim(),
      });

      if (res.ok && res.profile) {
        onSignedIn(res.profile);
      } else {
        setOnboardingError('Could not complete registration. Please try again.');
      }
    } catch (e) {
      const raw = (e as Error)?.message || '';
      if (
        !raw ||
        raw.includes('Fetch') ||
        raw.includes('canceled') ||
        raw.includes('cancelled') ||
        raw.includes('Network') ||
        raw.includes('connection') ||
        raw.includes('Abort')
      ) {
        setOnboardingError('Could not create your account. Please check your connection and try again.');
      } else {
        setOnboardingError(raw);
      }
    } finally {
      setOnboardingBusy(false);
    }
  };

  // =========================================================================
  // HEADER COMPONENT (Vibrant Purple with Organic Waves & Emblem)
  // =========================================================================
  const renderPurpleHeader = (title: string, subtitle: string, onBack?: () => void) => {
    const headerHeight = Math.max(220, 190 + insets.top);

    return (
      <View style={[styles.headerContainer, { height: headerHeight }]}>
        <StatusBar style="light" />

        {/* Purple Gradient & Organic Waves Background */}
        <Svg
          width="100%"
          height={headerHeight}
          viewBox={`0 0 375 ${headerHeight}`}
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <LinearGradient id="headerGrad" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor={THEME.primaryDeep} />
              <Stop offset="0.45" stopColor={THEME.primaryDark} />
              <Stop offset="0.8" stopColor={THEME.primary} />
              <Stop offset="1" stopColor={THEME.primaryLight} />
            </LinearGradient>
            <LinearGradient id="softWaveGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="rgba(255, 255, 255, 0.08)" />
              <Stop offset="0.5" stopColor="rgba(255, 255, 255, 0.15)" />
              <Stop offset="1" stopColor="rgba(255, 255, 255, 0.05)" />
            </LinearGradient>
          </Defs>

          {/* Base gradient fill */}
          <Path d={`M0,0 L375,0 L375,${headerHeight} L0,${headerHeight} Z`} fill="url(#headerGrad)" />

          {/* Organic background decorative waves */}
          <Path
            d={`M-20,${headerHeight * 0.45} C80,${headerHeight * 0.3} 160,${headerHeight * 0.65} 280,${headerHeight * 0.4} C330,${headerHeight * 0.3} 380,${headerHeight * 0.5} 400,${headerHeight * 0.45} L400,${headerHeight} L-20,${headerHeight} Z`}
            fill="url(#softWaveGrad)"
          />

          {/* Bottom organic curve transitioning to the white card sheet */}
          <Path
            d={`M0,${headerHeight - 32} C90,${headerHeight - 48} 220,${headerHeight - 8} 375,${headerHeight - 28} L375,${headerHeight} L0,${headerHeight} Z`}
            fill="#FFFFFF"
          />
        </Svg>

        {/* Back Button */}
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={[styles.backButton, { top: insets.top + 8 }]}
          >
            <Icon name="arrow.left" size={22} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Centered Logo Badge & Title Group */}
        <View style={[styles.headerContent, { paddingTop: insets.top + 14 }]}>
          <View style={styles.logoCircle}>
            <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>
    );
  };

  // =========================================================================
  // SCREEN 1: LOGIN
  // =========================================================================
  if (currentScreen === 'login') {
    return (
      <View style={styles.screenRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {renderPurpleHeader('Welcome', 'Sign in to continue')}

            {/* White Form Card */}
            <View style={styles.formCard}>
              {loginError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{loginError}</Text>
                </View>
              ) : null}

              {/* Email / Phone Field */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="person.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Email or Phone"
                  value={loginEmail}
                  onChangeText={(val) => {
                    setLoginEmail(val);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="Email or Phone"
                  placeholderTextColor={THEME.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  style={styles.textInput}
                />
              </View>

              {/* Password Field */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="lock.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Password"
                  value={loginPassword}
                  onChangeText={(val) => {
                    setLoginPassword(val);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="Password"
                  placeholderTextColor={THEME.placeholder}
                  secureTextEntry={!showLoginPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => handleLogin()}
                  style={styles.textInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showLoginPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  style={styles.eyeSlot}
                >
                  <Icon
                    name={showLoginPassword ? 'eye.slash' : 'eye'}
                    size={20}
                    color={THEME.placeholder}
                  />
                </Pressable>
              </View>

              {/* Forgot Password Link */}
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Reset Password',
                    'Password reset instructions have been sent to your registered school email.'
                  );
                }}
                style={styles.forgotPassButton}
              >
                <Text style={styles.forgotPassText}>Forgot Password?</Text>
              </Pressable>

              {/* Main Login Pill Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Login"
                disabled={loginBusy}
                onPress={() => handleLogin()}
                style={({ pressed }) => [
                  styles.primaryPillButton,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                  loginBusy && { opacity: 0.7 },
                ]}
              >
                {loginBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryPillButtonText}>Login</Text>
                )}
              </Pressable>

              {/* Bottom Switch to Sign Up */}
              <View style={styles.footerSwitchRow}>
                <Text style={styles.footerPromptText}>Don't have an account? </Text>
                <Pressable
                  onPress={() => {
                    setLoginError('');
                    setCurrentScreen('register_account');
                  }}
                >
                  <Text style={styles.footerActionText}>Sign up</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // =========================================================================
  // SCREEN 2: REGISTRATION (ACCOUNT DETAILS)
  // =========================================================================
  if (currentScreen === 'register_account') {
    return (
      <View style={styles.screenRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {renderPurpleHeader('Create Account', 'Sign up to continue', () =>
              setCurrentScreen('login')
            )}

            <View style={styles.formCard}>
              {accountError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{accountError}</Text>
                </View>
              ) : null}

              {/* First Name */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="person.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="First Name"
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    if (accountError) setAccountError('');
                  }}
                  placeholder="First Name"
                  placeholderTextColor={THEME.placeholder}
                  autoCapitalize="words"
                  style={styles.textInput}
                />
              </View>

              {/* Last Name */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="person.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Last Name"
                  value={lastName}
                  onChangeText={(val) => {
                    setLastName(val);
                    if (accountError) setAccountError('');
                  }}
                  placeholder="Last Name"
                  placeholderTextColor={THEME.placeholder}
                  autoCapitalize="words"
                  style={styles.textInput}
                />
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="envelope.fill" size={19} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Email address"
                  value={registerEmail}
                  onChangeText={(val) => {
                    setRegisterEmail(val);
                    if (accountError) setAccountError('');
                  }}
                  placeholder="Student Email address"
                  placeholderTextColor={THEME.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.textInput}
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="lock.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Password"
                  value={registerPassword}
                  onChangeText={(val) => {
                    setRegisterPassword(val);
                    if (accountError) setAccountError('');
                  }}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor={THEME.placeholder}
                  secureTextEntry={!showRegisterPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowRegisterPassword(!showRegisterPassword)}
                  style={styles.eyeSlot}
                >
                  <Icon
                    name={showRegisterPassword ? 'eye.slash' : 'eye'}
                    size={20}
                    color={THEME.placeholder}
                  />
                </Pressable>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <View style={styles.iconSlot}>
                  <Icon name="lock.fill" size={20} color={THEME.primary} />
                </View>
                <TextInput
                  accessibilityLabel="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (accountError) setAccountError('');
                  }}
                  placeholder="Confirm Password"
                  placeholderTextColor={THEME.placeholder}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeSlot}
                >
                  <Icon
                    name={showConfirmPassword ? 'eye.slash' : 'eye'}
                    size={20}
                    color={THEME.placeholder}
                  />
                </Pressable>
              </View>

              {/* Continue Pill Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue"
                onPress={handleContinueAccount}
                style={({ pressed }) => [
                  styles.primaryPillButton,
                  { marginTop: 12 },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
              >
                <Text style={styles.primaryPillButtonText}>Continue</Text>
              </Pressable>

              {/* Bottom Switch to Login */}
              <View style={styles.footerSwitchRow}>
                <Text style={styles.footerPromptText}>Already have an account? </Text>
                <Pressable onPress={() => setCurrentScreen('login')}>
                  <Text style={styles.footerActionText}>Sign in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // =========================================================================
  // SCREEN 3: ONBOARDING (STUDENT DETAILS)
  // =========================================================================
  return (
    <View style={styles.screenRoot}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {renderPurpleHeader('Student Profile', 'Set up your academic details', () =>
            setCurrentScreen('register_account')
          )}

          <View style={styles.formCard}>
            {onboardingError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{onboardingError}</Text>
              </View>
            ) : null}

            {/* School / Institution */}
            <View style={styles.inputContainer}>
              <View style={styles.iconSlot}>
                <Icon name="building.columns.fill" size={19} color={THEME.primary} />
              </View>
              <TextInput
                accessibilityLabel="School"
                value={school}
                onChangeText={setSchool}
                placeholder="School / University"
                placeholderTextColor={THEME.placeholder}
                style={styles.textInput}
              />
            </View>

            {/* Student ID */}
            <View style={styles.inputContainer}>
              <View style={styles.iconSlot}>
                <Icon name="graduationcap.fill" size={19} color={THEME.primary} />
              </View>
              <TextInput
                accessibilityLabel="Student ID"
                value={studentId}
                onChangeText={setStudentId}
                placeholder="Student ID No. (e.g. 2024-12345)"
                placeholderTextColor={THEME.placeholder}
                autoCapitalize="characters"
                style={styles.textInput}
              />
            </View>

            {/* Course / Degree */}
            <View style={styles.inputContainer}>
              <View style={styles.iconSlot}>
                <Icon name="book.closed.fill" size={19} color={THEME.primary} />
              </View>
              <TextInput
                accessibilityLabel="Course"
                value={course}
                onChangeText={setCourse}
                placeholder="Program / Course (e.g. BS Computer Science)"
                placeholderTextColor={THEME.placeholder}
                style={styles.textInput}
              />
            </View>

            {/* Year Level */}
            <View style={styles.inputContainer}>
              <View style={styles.iconSlot}>
                <Icon name="doc.text" size={19} color={THEME.primary} />
              </View>
              <TextInput
                accessibilityLabel="Year level"
                value={yearLevel}
                onChangeText={setYearLevel}
                placeholder="Year Level / Grade (e.g. 2nd Year)"
                placeholderTextColor={THEME.placeholder}
                style={styles.textInput}
              />
            </View>

            {/* Finish Registration Pill Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Complete Registration"
              disabled={onboardingBusy}
              onPress={handleFinishOnboarding}
              style={({ pressed }) => [
                styles.primaryPillButton,
                { marginTop: 12 },
                pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                onboardingBusy && { opacity: 0.7 },
              ]}
            >
              {onboardingBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryPillButtonText}>Complete Registration</Text>
              )}
            </Pressable>

            {/* Bottom Switch to Login */}
            <View style={styles.footerSwitchRow}>
              <Text style={styles.footerPromptText}>Already have an account? </Text>
              <Pressable onPress={() => setCurrentScreen('login')}>
                <Text style={styles.footerActionText}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =========================================================================
// STYLES
// =========================================================================
const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
  },

  // -------------------------------------------------------------------------
  // PURPLE HEADER & ORGANIC EMBLEM
  // -------------------------------------------------------------------------
  headerContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#3B0764',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14.5,
    color: '#E9D5FF',
    textAlign: 'center',
    fontWeight: '400',
  },

  // -------------------------------------------------------------------------
  // FORM CARD & PILL INPUTS
  // -------------------------------------------------------------------------
  formCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 40,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  errorBanner: {
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  inputContainer: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: THEME.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  iconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: THEME.textDark,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeSlot: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // -------------------------------------------------------------------------
  // FORGOT PASSWORD
  // -------------------------------------------------------------------------
  forgotPassButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 24,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  forgotPassText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primaryDark,
  },

  // -------------------------------------------------------------------------
  // PRIMARY PILL BUTTON
  // -------------------------------------------------------------------------
  primaryPillButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryPillButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },


  // -------------------------------------------------------------------------
  // FOOTER SWITCH
  // -------------------------------------------------------------------------
  footerSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  footerPromptText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  footerActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.primary,
  },
});
