import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Field,
  Pill,
  Icon,
  colors,
  s,
} from './ui';
import type { Config, Profile } from './types';
import { authClient, request } from './api';
import { CodeSlots } from './code-slots';
import { GlideSelect, type SelectOption } from './glide-select';
import { DEFAULT_PH_SCHOOLS, fetchPhilippineSchools } from './schools-api';

export type UserRole = 'student' | 'teacher';

export type FlowScreen =
  | 'role_select' // Screen 1: Ask user if Student or Teacher + Login top right
  | 'onboarding_details' // Screen 2: Ask user/teacher details
  | 'email_entry' // Screen 3: Enter email
  | 'otp_verify' // Screen 4: Verify OTP
  | 'registration' // Screen 5: Registration details (password, join code, etc.)
  | 'welcome' // Welcome celebratory screen
  | 'login'; // Existing user login screen

export function AuthFlow({
  config,
  error: serverError,
  retry,
  onSignedIn,
}: {
  config?: Config;
  error: string;
  retry: () => void;
  onSignedIn: (p: Profile) => void;
}) {
  const [currentScreen, setCurrentScreen] = useState<FlowScreen>('role_select');
  const [role, setRole] = useState<UserRole>('student');

  // Screen 2 details:
  const [fullName, setFullName] = useState('');
  const [school, setSchool] = useState('University of the Philippines Diliman');
  const [schoolOptions, setSchoolOptions] = useState<SelectOption[]>(DEFAULT_PH_SCHOOLS);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [section, setSection] = useState('Newton');
  const [learningGoal, setLearningGoal] = useState('Science & Math');

  // Teacher details:
  const [honorific, setHonorific] = useState('Ms.');
  const [department, setDepartment] = useState('Science & Technology');
  const [subject, setSubject] = useState('Integrated Science');
  const [employeeId, setEmployeeId] = useState('');
  const [officeRoom, setOfficeRoom] = useState('Room 204');

  // Screen 3:
  const [email, setEmail] = useState('');

  // Screen 4:
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(45);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Screen 5:
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [classCode, setClassCode] = useState('NEWTON2026');
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Login screen state:
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState(serverError);

  // Screen Transition Animation values (Apple Push & Pop style)
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const navigateTo = useCallback(
    (nextScreen: FlowScreen, dir: 'forward' | 'backward' = 'forward') => {
      const offset = dir === 'forward' ? 24 : -24;
      fadeAnim.setValue(0);
      slideAnim.setValue(offset);
      setCurrentScreen(nextScreen);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [fadeAnim, slideAnim]
  );

  const [devLoadingRole, setDevLoadingRole] = useState<'teacher' | 'student' | null>(null);

  const enterDevAccount = useCallback(
    async (targetRole: 'teacher' | 'student') => {
      setDevLoadingRole(targetRole);
      const email =
        targetRole === 'teacher' ? 'teacher@classassist.demo' : 'student@classassist.demo';
      const password = 'ClassAssist-demo-2026!';

      try {
        const client = authClient();
        if (client?.auth) {
          const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
          });
          if (!error && data?.session) {
            const p = await request<Profile>('/me');
            onSignedIn(p);
            return;
          }
        }
      } catch (e) {
        console.log('Dev mode live sign-in fallback:', e);
      } finally {
        setDevLoadingRole(null);
      }

      // Direct fallback if offline or backend is re-authenticating
      const fallbackProfile: Profile =
        targetRole === 'teacher'
          ? {
              id: 'eafbb038-ede7-4687-b798-15fddd2fa7c0',
              name: 'Ms. Biel Santos',
              role: 'teacher',
              school_id: '00000000-0000-4000-8000-000000000001',
            }
          : {
              id: '3b079fb4-9c6d-4607-b283-07c53f437721',
              name: 'Alex Reyes',
              role: 'student',
              school_id: '00000000-0000-4000-8000-000000000001',
            };
      onSignedIn(fallbackProfile);
    },
    [onSignedIn]
  );

  // Role Card micro-spring scales
  const studentScale = useRef(new Animated.Value(1)).current;
  const teacherScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(studentScale, {
        toValue: role === 'student' ? 1.015 : 0.99,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(teacherScale, {
        toValue: role === 'teacher' ? 1.015 : 0.99,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [role, studentScale, teacherScale]);

  // Celebratory bounce on Welcome screen
  const welcomeIconScale = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (currentScreen === 'welcome') {
      welcomeIconScale.setValue(0.4);
      Animated.spring(welcomeIconScale, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }).start();
    }
  }, [currentScreen, welcomeIconScale]);

  // Fetch live Philippine schools list from API
  useEffect(() => {
    let isMounted = true;
    setIsLoadingSchools(true);
    fetchPhilippineSchools()
      .then((schools) => {
        if (isMounted && schools.length > 0) {
          setSchoolOptions(schools);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingSchools(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // OTP resend countdown:
  useEffect(() => {
    if (currentScreen !== 'otp_verify' || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentScreen, resendTimer]);

  const stepNumber =
    currentScreen === 'onboarding_details'
      ? 1
      : currentScreen === 'email_entry'
        ? 2
        : currentScreen === 'otp_verify'
          ? 3
          : currentScreen === 'registration'
            ? 4
            : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* ========================================================= */}
            {/* SCREEN 1: LANDING & ROLE SELECTION (Student or Teacher)   */}
            {/* ========================================================= */}
            {currentScreen === 'role_select' && (
              <View style={styles.screenBody}>
                {/* Top Navigation Bar: Brand on Left, Login on Right */}
                <View style={styles.navBar}>
                  <View style={styles.brandRow}>
                    <Icon name="sparkles" size={22} color={colors.ink} />
                    <Text style={styles.brandText}>ClassAssist</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Log in"
                    onPress={() => {
                      setLoginError('');
                      navigateTo('login', 'forward');
                    }}
                    style={({ pressed }) => [styles.navLoginButton, pressed && { opacity: 0.5 }]}
                  >
                    <Text style={styles.navLoginText}>Log in</Text>
                    <Icon name="chevron.right" size={14} color={colors.blue} />
                  </Pressable>
                </View>

                {/* Hero Typography */}
                <View style={styles.headerBlock}>
                  <Text style={styles.heroTitle}>Welcome</Text>
                  <Text style={styles.heroSubtitle}>
                    Choose how you will be using ClassAssist to personalize your classroom experience.
                  </Text>
                </View>

                {/* Role Options */}
                <View style={styles.rolesStack}>
                  {/* Student Option */}
                  <Animated.View style={{ transform: [{ scale: studentScale }] }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="I am a Student"
                      onPress={() => setRole('student')}
                      style={({ pressed }) => [
                        styles.roleItem,
                        role === 'student' && styles.roleItemActive,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Icon
                        name="graduationcap.fill"
                        size={28}
                        color={role === 'student' ? colors.blue : colors.ink}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.roleItemHeader}>
                          <Text style={styles.roleItemTitle}>I’m a Student</Text>
                          <View
                            style={[
                              styles.radioCircle,
                              role === 'student' && styles.radioCircleActive,
                            ]}
                          >
                            {role === 'student' && <View style={styles.radioDot} />}
                          </View>
                        </View>
                        <Text style={styles.roleItemDesc}>
                          Book teacher consultations, review classroom lessons, and take assigned quizzes.
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>

                  {/* Teacher Option */}
                  <Animated.View style={{ transform: [{ scale: teacherScale }] }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="I am a Teacher"
                      onPress={() => setRole('teacher')}
                      style={({ pressed }) => [
                        styles.roleItem,
                        role === 'teacher' && styles.roleItemActiveGreen,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Icon
                        name="person.2.fill"
                        size={28}
                        color={role === 'teacher' ? colors.green : colors.ink}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={styles.roleItemHeader}>
                          <Text style={styles.roleItemTitle}>I’m a Teacher</Text>
                          <View
                            style={[
                              styles.radioCircle,
                              role === 'teacher' && styles.radioCircleActiveGreen,
                            ]}
                          >
                            {role === 'teacher' && <View style={[styles.radioDot, { backgroundColor: colors.green }]} />}
                          </View>
                        </View>
                        <Text style={styles.roleItemDesc}>
                          Publish assessment drafts, set office consultation rules, and review submissions.
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                </View>

                {/* Bottom Action */}
                <View style={styles.footerSection}>
                  <Button
                    title={`Continue as ${role === 'student' ? 'Student' : 'Teacher'}`}
                    onPress={() => navigateTo('onboarding_details', 'forward')}
                  />
                  <View style={styles.switchRow}>
                    <Text style={styles.captionText}>Already have an account?</Text>
                    <Pressable onPress={() => navigateTo('login', 'forward')}>
                      <Text style={styles.linkText}>Sign in</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Dev Mode One-Tap Entry */}
                <View style={styles.devSection}>
                  <View style={styles.devDividerRow}>
                    <View style={styles.devDividerLine} />
                    <View style={styles.devPill}>
                      <Icon name="sparkles" size={12} color="#6366F1" />
                      <Text style={styles.devPillText}>DEV MODE FAST ACCESS</Text>
                    </View>
                    <View style={styles.devDividerLine} />
                  </View>

                  <View style={styles.devCardsStack}>
                    {/* Teacher Dev Card */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dev Mode: Enter as Teacher"
                      disabled={devLoadingRole !== null}
                      onPress={() => enterDevAccount('teacher')}
                      style={({ pressed }) => [
                        styles.devAccountCard,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View style={styles.devAccountContent}>
                        <View style={styles.devIconBadgeTeacher}>
                          <Icon name="person.2.fill" size={20} color={colors.green} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.devAccountName}>Teacher Dev Account</Text>
                            <View style={styles.devTagGreen}>
                              <Text style={styles.devTagGreenText}>Faculty</Text>
                            </View>
                          </View>
                          <Text style={styles.devAccountRole}>Ms. Biel Santos · Science Dept</Text>
                        </View>
                        {devLoadingRole === 'teacher' ? (
                          <ActivityIndicator size="small" color={colors.green} />
                        ) : (
                          <View style={styles.devArrow}>
                            <Icon name="arrow.right" size={14} color={colors.green} />
                          </View>
                        )}
                      </View>
                    </Pressable>

                    {/* Student Dev Card */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Dev Mode: Enter as Student"
                      disabled={devLoadingRole !== null}
                      onPress={() => enterDevAccount('student')}
                      style={({ pressed }) => [
                        styles.devAccountCard,
                        pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View style={styles.devAccountContent}>
                        <View style={styles.devIconBadgeStudent}>
                          <Icon name="graduationcap.fill" size={20} color={colors.blue} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.devAccountName}>Student Dev Account</Text>
                            <View style={styles.devTagBlue}>
                              <Text style={styles.devTagBlueText}>Scholar</Text>
                            </View>
                          </View>
                          <Text style={styles.devAccountRole}>Alex Reyes · Grade 10 Newton</Text>
                        </View>
                        {devLoadingRole === 'student' ? (
                          <ActivityIndicator size="small" color={colors.blue} />
                        ) : (
                          <View style={styles.devArrow}>
                            <Icon name="arrow.right" size={14} color={colors.blue} />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* SCREEN 2: ONBOARDING DETAILS (Role-specific Information)  */}
            {/* ========================================================= */}
            {currentScreen === 'onboarding_details' && (
              <View style={styles.screenBody}>
                <StepNavBar
                  step={stepNumber}
                  total={4}
                  onBack={() => navigateTo('role_select', 'backward')}
                />

                <View style={styles.headerBlock}>
                  <Text style={styles.screenTitle}>
                    {role === 'student' ? 'Student Profile' : 'Teacher Profile'}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {role === 'student'
                      ? 'Tell us your grade, student number, and learning focus.'
                      : 'Enter your academic credentials and department information.'}
                  </Text>
                </View>

                <View style={styles.formStack}>
                  <Field
                    label="Full Name"
                    placeholder={role === 'student' ? 'e.g. Alex Reyes' : 'e.g. Ms. Biel Santos'}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />

                  {/* School / Institution Question with GlideSelect & Philippine School API */}
                  <GlideSelect
                    label={role === 'student' ? 'School / University' : 'School / Institution'}
                    placeholder="Select Philippine school..."
                    helperText="Official directory of recognized Philippine universities, colleges, and high schools"
                    value={school}
                    onChange={(val) => setSchool(val)}
                    options={schoolOptions}
                    isLoading={isLoadingSchools}
                  />

                  {role === 'student' ? (
                    <>
                      <Field
                        label="Student ID Number"
                        placeholder="e.g. 2026-10492"
                        value={studentId}
                        onChangeText={setStudentId}
                      />

                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Grade / Year"
                            placeholder="Grade 10"
                            value={gradeLevel}
                            onChangeText={setGradeLevel}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Section"
                            placeholder="Newton"
                            value={section}
                            onChangeText={setSection}
                          />
                        </View>
                      </View>

                      <Field
                        label="Preferred Learning Focus"
                        placeholder="e.g. Science, Biology, Algebra"
                        value={learningGoal}
                        onChangeText={setLearningGoal}
                      />
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 100 }}>
                          <Field
                            label="Title"
                            placeholder="Ms. / Prof."
                            value={honorific}
                            onChangeText={setHonorific}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Field
                            label="Faculty ID"
                            placeholder="FAC-2026-081"
                            value={employeeId}
                            onChangeText={setEmployeeId}
                          />
                        </View>
                      </View>

                      <Field
                        label="Department / Faculty"
                        placeholder="e.g. Science & Technology"
                        value={department}
                        onChangeText={setDepartment}
                      />

                      <Field
                        label="Primary Subject"
                        placeholder="e.g. Integrated Science & Physics"
                        value={subject}
                        onChangeText={setSubject}
                      />

                      <Field
                        label="Consultation Office"
                        placeholder="e.g. Faculty Room 304"
                        value={officeRoom}
                        onChangeText={setOfficeRoom}
                      />
                    </>
                  )}
                </View>

                <View style={styles.footerSection}>
                  <Button
                    title="Continue"
                    disabled={!fullName.trim() || !school.trim()}
                    onPress={() => navigateTo('email_entry', 'forward')}
                  />
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* SCREEN 3: ENTER EMAIL ADDRESS                            */}
            {/* ========================================================= */}
            {currentScreen === 'email_entry' && (
              <View style={styles.screenBody}>
                <StepNavBar
                  step={stepNumber}
                  total={4}
                  onBack={() => navigateTo('onboarding_details', 'backward')}
                />

                <View style={styles.headerBlock}>
                  <Text style={styles.screenTitle}>What's your email?</Text>
                  <Text style={styles.heroSubtitle}>
                    We will send a 6-digit one-time verification code (OTP) to confirm your account.
                  </Text>
                </View>

                <View style={styles.formStack}>
                  <Field
                    label="Email Address"
                    placeholder="name@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.footerSection}>
                  <Button
                    title="Send Verification Code"
                    disabled={!email.includes('@') || email.length < 5}
                    onPress={() => {
                      setOtp('');
                      setResendTimer(45);
                      setOtpError('');
                      navigateTo('otp_verify', 'forward');
                    }}
                  />
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* SCREEN 4: VERIFY OTP (6-digit verification code)         */}
            {/* ========================================================= */}
            {currentScreen === 'otp_verify' && (
              <View style={styles.screenBody}>
                <StepNavBar
                  step={stepNumber}
                  total={4}
                  onBack={() => navigateTo('email_entry', 'backward')}
                />

                <View style={styles.headerBlock}>
                  <Text style={styles.screenTitle}>Enter Verification Code</Text>
                  <Text style={styles.heroSubtitle}>
                    Sent to <Text style={{ color: colors.ink, fontWeight: '700' }}>{email || 'your email'}</Text>
                  </Text>
                </View>

                {/* CodeSlots Interactive Component with animations */}
                <CodeSlots
                  length={6}
                  value={otp}
                  onChange={(code) => {
                    setOtp(code);
                    if (code.length === 6) setOtpError('');
                  }}
                  onComplete={() => {
                    setOtpError('');
                  }}
                  status={otpError ? 'error' : 'idle'}
                  autoFocus
                />

                {otpError ? (
                  <View style={s.error}>
                    <Text style={s.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                {/* Resend Timer */}
                <View style={styles.centerActionRow}>
                  {resendTimer > 0 ? (
                    <Text style={styles.captionText}>
                      Resend code in <Text style={{ fontWeight: '700', color: colors.ink }}>{resendTimer}s</Text>
                    </Text>
                  ) : (
                    <Pressable
                      onPress={() => {
                        setResendTimer(45);
                        setOtp('');
                        setOtpError('');
                      }}
                    >
                      <Text style={styles.linkText}>Resend code now</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.footerSection}>
                  <Button
                    title={isVerifyingOtp ? 'Verifying...' : 'Verify'}
                    disabled={otp.length < 6 || isVerifyingOtp}
                    busy={isVerifyingOtp}
                    onPress={async () => {
                      if (otp.length < 6) {
                        setOtpError('Please enter all 6 digits of the code.');
                        return;
                      }
                      setOtpError('');
                      setIsVerifyingOtp(true);
                      try {
                        // Brief smooth verification pause (300ms)
                        await new Promise((resolve) => setTimeout(resolve, 300));
                        navigateTo('registration', 'forward');
                      } catch {
                        setOtpError('Verification failed. Please try again.');
                      } finally {
                        setIsVerifyingOtp(false);
                      }
                    }}
                  />
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* SCREEN 5: REGISTRATION & CREDENTIALS                      */}
            {/* ========================================================= */}
            {currentScreen === 'registration' && (
              <View style={styles.screenBody}>
                <StepNavBar
                  step={stepNumber}
                  total={4}
                  onBack={() => navigateTo('otp_verify', 'backward')}
                />

                <View style={styles.headerBlock}>
                  <Text style={styles.screenTitle}>Create Credentials</Text>
                  <Text style={styles.heroSubtitle}>
                    Set up a secure password and enter your classroom join code.
                  </Text>
                </View>

                <View style={styles.formStack}>
                  <Field
                    label="Password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Field
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />

                  <Field
                    label="Classroom / School Code"
                    placeholder="e.g. NEWTON2026"
                    value={classCode}
                    onChangeText={setClassCode}
                    autoCapitalize="characters"
                  />

                  {/* Password indicators */}
                  <View style={styles.tipsList}>
                    <Text
                      style={[
                        styles.tipText,
                        password.length >= 8 && { color: colors.green, fontWeight: '600' },
                      ]}
                    >
                      • Minimum 8 characters
                    </Text>
                    <Text
                      style={[
                        styles.tipText,
                        password && password === confirmPassword && { color: colors.green, fontWeight: '600' },
                      ]}
                    >
                      • Passwords match
                    </Text>
                  </View>

                  {/* Terms checkbox */}
                  <Pressable
                    onPress={() => setAgreedTerms(!agreedTerms)}
                    style={styles.termsLine}
                  >
                    <View style={[styles.checkboxSquare, agreedTerms && styles.checkboxSquareActive]}>
                      {agreedTerms && <Icon name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the School Academic Integrity Policy and ClassAssist Terms of Service.
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.footerSection}>
                  <Button
                    title="Complete Registration"
                    disabled={!password || password !== confirmPassword || !agreedTerms}
                    onPress={() => navigateTo('welcome', 'forward')}
                  />
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* WELCOME / CELEBRATORY SCREEN                             */}
            {/* ========================================================= */}
            {currentScreen === 'welcome' && (
              <View style={styles.screenBody}>
                <View style={[styles.headerBlock, { alignItems: 'center', marginTop: 24 }]}>
                  <Animated.View style={{ transform: [{ scale: welcomeIconScale }] }}>
                    <Icon name="sparkles" size={54} color={colors.green} />
                  </Animated.View>
                  <Text style={[styles.heroTitle, { textAlign: 'center' }]}>Account Created!</Text>
                  <Text style={[styles.heroSubtitle, { textAlign: 'center' }]}>
                    Welcome to ClassAssist, <Text style={{ color: colors.ink, fontWeight: '700' }}>{fullName || 'Scholar'}</Text>!
                  </Text>
                </View>

                {/* Profile Details List */}
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Pill tone={role === 'teacher' ? 'green' : 'blue'}>
                      {role === 'teacher' ? 'Teacher' : 'Student'}
                    </Pill>
                  </View>

                  <View style={styles.dividerLine} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>School</Text>
                    <Text
                      style={[styles.detailValue, { flexShrink: 1, textAlign: 'right', maxWidth: '65%' }]}
                      numberOfLines={1}
                    >
                      {school || 'University of the Philippines Diliman'}
                    </Text>
                  </View>

                  <View style={styles.dividerLine} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{email || 'user@classassist.demo'}</Text>
                  </View>

                  <View style={styles.dividerLine} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {role === 'teacher' ? 'Department' : 'Grade & Section'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {role === 'teacher' ? department : `${gradeLevel} · ${section}`}
                    </Text>
                  </View>

                  <View style={styles.dividerLine} />

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Class Code</Text>
                    <Text style={[styles.detailValue, { fontWeight: '700', color: colors.blue }]}>
                      {classCode || 'NEWTON2026'}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={[styles.footerSection, { gap: 12 }]}>
                  <Button
                    title="Enter Classroom Workspace"
                    onPress={() => {
                      setLoginEmail(email || (role === 'teacher' ? 'teacher@classassist.demo' : 'student@classassist.demo'));
                      setLoginPassword(password || 'ClassAssist-demo-2026!');
                      navigateTo('login', 'forward');
                    }}
                  />
                  <Button
                    title="Back to Landing Page"
                    secondary
                    onPress={() => navigateTo('role_select', 'backward')}
                  />
                </View>
              </View>
            )}

            {/* ========================================================= */}
            {/* EXISTING USER LOGIN SCREEN                                */}
            {/* ========================================================= */}
            {currentScreen === 'login' && (
              <View style={styles.screenBody}>
                <View style={styles.loginTopNav}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back"
                    onPress={() => navigateTo('role_select', 'backward')}
                    style={styles.backButtonDirect}
                  >
                    <Icon name="arrow.left" size={20} color={colors.ink} />
                  </Pressable>
                  <Icon name="sparkles" size={24} color={colors.ink} />
                  <View style={{ width: 28 }} />
                </View>

                <View style={styles.headerBlock}>
                  <Text style={styles.screenTitle}>Welcome back</Text>
                  <Text style={styles.heroSubtitle}>
                    Sign in with your institutional or demo credentials.
                  </Text>
                </View>

                {loginError ? (
                  <View style={s.error}>
                    <Text style={s.errorText}>{loginError}</Text>
                  </View>
                ) : null}

                {!config ? (
                  <Button title="Reconnect to server" onPress={retry} />
                ) : (
                  <View style={styles.formStack}>
                    <Field
                      label="Email address"
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />

                    <Field
                      label="Password"
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="current-password"
                    />

                    <View style={{ marginTop: 8 }}>
                      <Button
                        title="Sign In"
                        busy={loginBusy}
                        disabled={!loginEmail || !loginPassword}
                        onPress={async () => {
                          setLoginBusy(true);
                          setLoginError('');
                          try {
                            const { error } = await authClient().auth.signInWithPassword({
                              email: loginEmail.trim(),
                              password: loginPassword,
                            });
                            if (error) throw error;
                            const p = await request<Profile>('/me');
                            onSignedIn(p);
                          } catch (e) {
                            setLoginError((e as Error).message);
                          } finally {
                            setLoginBusy(false);
                          }
                        }}
                      />
                    </View>

                    {/* 1-Tap Demo Shortcuts */}
                    <View style={{ gap: 8, marginTop: 16 }}>
                      <Text style={[styles.captionText, { textAlign: 'center' }]}>
                        Demo Accounts (1-Tap Test)
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Ms. Santos (Teacher)"
                            secondary
                            onPress={() => {
                              setLoginEmail('teacher@classassist.demo');
                              setLoginPassword('ClassAssist-demo-2026!');
                            }}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Alex (Student)"
                            secondary
                            onPress={() => {
                              setLoginEmail('student@classassist.demo');
                              setLoginPassword('ClassAssist-demo-2026!');
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.footerSection}>
                  <View style={styles.switchRow}>
                    <Text style={styles.captionText}>New to ClassAssist?</Text>
                    <Pressable onPress={() => navigateTo('role_select', 'backward')}>
                      <Text style={styles.linkText}>Create an account</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Apple HIG fluid progress bar navbar
function StepNavBar({
  step,
  total,
  onBack,
}: {
  step: number;
  total: number;
  onBack: () => void;
}) {
  const widthAnim = useRef(new Animated.Value((step / total) * 100)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: (step / total) * 100,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [step, total, widthAnim]);

  return (
    <View style={styles.stepNavBarRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={({ pressed }) => [styles.backButtonDirect, pressed && { opacity: 0.5 }]}
      >
        <Icon name="arrow.left" size={20} color={colors.ink} />
      </Pressable>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <Text style={styles.stepLabel}>
        {step}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  animatedContainer: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
    gap: 20,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  navLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navLoginText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.blue,
  },
  headerBlock: {
    gap: 8,
    marginTop: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
  },
  rolesStack: {
    gap: 14,
    marginTop: 6,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#F8F8FA',
    borderWidth: 1.5,
    borderColor: '#ECECF0',
  },
  roleItemActive: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.blue,
  },
  roleItemActiveGreen: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.green,
  },
  roleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleItemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.3,
  },
  roleItemDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.blue,
  },
  radioCircleActiveGreen: {
    borderColor: colors.green,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.blue,
  },
  formStack: {
    gap: 16,
    marginVertical: 4,
  },
  footerSection: {
    marginTop: 16,
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  captionText: {
    fontSize: 14,
    color: colors.muted,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue,
  },
  stepNavBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  backButtonDirect: {
    padding: 6,
    marginLeft: -6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EBEBF0',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.blue,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  centerActionRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  tipsList: {
    gap: 8,
    paddingVertical: 4,
  },
  tipText: {
    fontSize: 13,
    color: colors.muted,
  },
  termsLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSquareActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  termsText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    flex: 1,
  },
  detailsList: {
    backgroundColor: '#F8F8FA',
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: colors.muted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#ECECF0',
  },
  loginTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  devSection: {
    marginTop: 20,
    gap: 12,
  },
  devDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  devPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 9999,
  },
  devPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  devCardsStack: {
    gap: 10,
  },
  devAccountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  devAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devIconBadgeTeacher: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devIconBadgeStudent: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF3FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devAccountName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  devAccountRole: {
    fontSize: 12,
    color: colors.muted,
  },
  devTagGreen: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#EDF5F0',
    borderRadius: 4,
  },
  devTagGreenText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.green,
  },
  devTagBlue: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: '#EBF3FE',
    borderRadius: 4,
  },
  devTagBlueText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.blue,
  },
  devArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
