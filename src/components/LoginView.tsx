import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from '../firebase.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  User,
  Mail,
  Phone,
  AtSign,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  RotateCw,
  ArrowLeft,
  Sun,
  Moon
} from 'lucide-react';
import { chatService } from '../services/chatService.ts';
import { otpService } from '../services/otpService.ts';
import { ALL_COUNTRIES, POPULAR_COUNTRIES, CountryCode } from '../data/countryCodes.ts';
import { cleanAvatarUrl } from '../utils/avatarUtils.ts';

interface LoginViewProps {
  onSignInSuccess?: () => void;
}

type AuthMode = 'login' | 'signup' | 'verify-signup-otp' | 'forgot' | 'verify-forgot-otp';

export const LoginView: React.FC<LoginViewProps> = ({ onSignInSuccess }) => {
  const { isDayMode, toggleTheme, accent, setAccent, accentConfig, allAccents } = useTheme();

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Q ID or Email or Phone
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupQid, setSignupQid] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
    ALL_COUNTRIES.find((c) => c.country === 'BD') || POPULAR_COUNTRIES[0]
  );
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Pending signup details waiting for OTP verification
  const [pendingSignup, setPendingSignup] = useState<{
    name: string;
    qid: string;
    phone: string;
    email: string;
    password: string;
  } | null>(null);

  // 6-digit OTP verification state
  const [signupOtp, setSignupOtp] = useState('');

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resolvedForgotEmail, setResolvedForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resend cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Clean error and success messages when mode changes
  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // --- 1. HANDLE LOGIN (Email / Phone / Q ID + Password) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = loginIdentifier.trim();
    const pass = loginPassword.trim();

    if (!ident) {
      setErrorMsg('Please enter your Q ID, Email, or Phone Number.');
      return;
    }
    if (!pass) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let emailToAuth = ident;
      let matchedUserDoc = null;

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ident);
      if (!isEmail) {
        matchedUserDoc = await chatService.findUserByIdentifier(ident);
        if (!matchedUserDoc || !matchedUserDoc.email) {
          throw new Error('No user account found matching this Q ID or Phone Number. Please check your credentials or Sign Up.');
        }
        emailToAuth = matchedUserDoc.email;
      } else {
        matchedUserDoc = await chatService.findUserByIdentifier(ident);
      }

      // Check if user requires OTP verification
      if (matchedUserDoc && matchedUserDoc.emailVerified === false) {
        setPendingSignup({
          name: matchedUserDoc.displayName || 'User',
          qid: matchedUserDoc.qid || '',
          phone: matchedUserDoc.phoneNumber || '',
          email: emailToAuth,
          password: pass
        });
        await otpService.sendOtp(emailToAuth, 'register', matchedUserDoc.displayName);
        setResendCooldown(60);
        setAuthMode('verify-signup-otp');
        setLoading(false);
        return;
      }

      // Check password: first against hashed password if user has passwordHash
      const enteredHash = await otpService.hashPassword(pass);
      const internalCred = await otpService.getAuthCredential(emailToAuth);

      let signedIn = false;

      if (matchedUserDoc && matchedUserDoc.passwordHash) {
        if (matchedUserDoc.passwordHash !== enteredHash) {
          throw new Error('Invalid password. Please try again or reset your password.');
        }
        try {
          await signInWithEmailAndPassword(auth, emailToAuth, internalCred);
          signedIn = true;
        } catch {
          // Fallback to direct password sign-in
        }
      }

      if (!signedIn) {
        try {
          await signInWithEmailAndPassword(auth, emailToAuth, pass);
          signedIn = true;
        } catch (rawErr: any) {
          if (internalCred) {
            try {
              await signInWithEmailAndPassword(auth, emailToAuth, internalCred);
              signedIn = true;
            } catch {
              throw rawErr;
            }
          } else {
            throw rawErr;
          }
        }
      }

      if (auth.currentUser) {
        try {
          localStorage.setItem(`qchat_verified_${auth.currentUser.uid}`, 'true');
        } catch {
          // ignore
        }
      }

      if (onSignInSuccess) onSignInSuccess();
    } catch (err: unknown) {
      console.error('Login error:', err);
      const msg = err instanceof Error ? err.message : 'Login failed.';
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg('Email/Password sign-in method is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.');
      } else if (msg.includes('wrong-password') || msg.includes('invalid-credential') || msg.includes('invalid-login-credentials')) {
        setErrorMsg('Invalid password or credentials. Please try again.');
      } else if (msg.includes('user-not-found')) {
        setErrorMsg('No user account found with this email. Please sign up first.');
      } else if (msg.includes('too-many-requests')) {
        setErrorMsg('Access temporarily blocked due to too many failed attempts. Please try again later.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 2. STEP 1: INITIATE SIGN UP -> SEND 6-DIGIT OTP VIA GMAIL ---
  const handleInitiateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = signupName.trim();
    const phone = signupPhone.trim();
    const email = signupEmail.trim().toLowerCase();
    const pass = signupPassword.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone) {
      setErrorMsg('Please enter your mobile phone number.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (pass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const fullPhone = `${selectedCountry.code} ${phone}`;

      let finalQid = signupQid.trim().replace(/^@/, '').toLowerCase();
      if (!finalQid) {
        finalQid = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      }

      // Check if Q ID is already taken by another user
      const existingUserWithQid = await chatService.findUserByIdentifier(finalQid);
      if (existingUserWithQid && existingUserWithQid.email !== email) {
        throw new Error(`The Q ID "@${finalQid}" is already taken. Please choose a different handle.`);
      }

      // Store pending signup data
      setPendingSignup({
        name,
        qid: finalQid,
        phone: fullPhone,
        email,
        password: pass
      });

      // Send 6-Digit numeric code directly to user's real email via Gmail SMTP (NO LINKS!)
      const res = await otpService.sendOtp(email, 'register', name);
      if (!res.success) {
        throw new Error(res.error || 'Failed to send verification code.');
      }

      setResendCooldown(60);
      setSignupOtp('');
      setAuthMode('verify-signup-otp');
      // Do not clutter the top with redundant alert; the email is shown neatly under the title
      setErrorMsg(null);
      setSuccessMsg(null);
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send verification code.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. STEP 2: VERIFY 6-DIGIT OTP AND COMPLETE ACCOUNT CREATION ---
  const handleVerifySignUpOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSignup) {
      setErrorMsg('Registration data was not found. Please start over.');
      setAuthMode('signup');
      return;
    }

    const cleanOtp = signupOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Please enter the exact 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Verify 6-digit OTP code against server
      const verifyRes = await otpService.verifyOtp(pendingSignup.email, cleanOtp);
      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'Invalid code or code has expired.');
      }

      const internalCredential = verifyRes.internalCredential || (await otpService.getAuthCredential(pendingSignup.email));
      const passwordHash = await otpService.hashPassword(pendingSignup.password);

      // 2. Create Firebase Auth user
      let user = null;
      try {
        const cred = await createUserWithEmailAndPassword(auth, pendingSignup.email, internalCredential);
        user = cred.user;
      } catch (authErr: any) {
        if (authErr?.message?.includes('email-already-in-use')) {
          try {
            const loginCred = await signInWithEmailAndPassword(auth, pendingSignup.email, internalCredential);
            user = loginCred.user;
          } catch {
            const loginRaw = await signInWithEmailAndPassword(auth, pendingSignup.email, pendingSignup.password);
            user = loginRaw.user;
          }
        } else {
          const credRaw = await createUserWithEmailAndPassword(auth, pendingSignup.email, pendingSignup.password);
          user = credRaw.user;
        }
      }

      if (!user) {
        throw new Error('Failed to create account. Please try again.');
      }

      // 3. Update display name & avatar in Firebase Auth
      const photoURL = cleanAvatarUrl(null, pendingSignup.name);
      try {
        await updateProfile(user, {
          displayName: pendingSignup.name,
          photoURL: photoURL
        });
      } catch {
        // ignore
      }

      // 4. Save verified user record into Firestore users collection
      await chatService.saveUserProfile({
        uid: user.uid,
        qid: pendingSignup.qid,
        displayName: pendingSignup.name,
        email: pendingSignup.email,
        phoneNumber: pendingSignup.phone,
        photoURL: photoURL,
        statusText: 'Active on QChat',
        emailVerified: true,
        passwordHash: passwordHash,
        isOnline: true,
        createdAt: new Date().toISOString()
      });

      try {
        localStorage.setItem(`qchat_verified_${user.uid}`, 'true');
      } catch {
        // ignore
      }

      setSuccessMsg('Account verified! Entering QChat...');
      if (onSignInSuccess) {
        setTimeout(() => {
          onSignInSuccess();
        }, 800);
      }
    } catch (err: unknown) {
      console.error('Verify OTP and register error:', err);
      const msg = err instanceof Error ? err.message : 'Verification failed.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend Sign Up OTP
  const handleResendSignUpOtp = async () => {
    if (!pendingSignup || resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await otpService.sendOtp(pendingSignup.email, 'register', pendingSignup.name);
      if (!res.success) {
        throw new Error(res.error || 'Failed to resend code.');
      }
      setResendCooldown(60);
      setSuccessMsg(`A new 6-digit code has been sent to ${pendingSignup.email}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. STEP 1: FORGOT PASSWORD -> LOOKUP & SEND 6-DIGIT OTP ---
  const handleInitiateForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const ident = forgotIdentifier.trim();

    if (!ident) {
      setErrorMsg('Please enter your registered Email, Q ID, or Phone Number.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let emailToSend = ident;

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ident);
      if (!isEmail) {
        const foundUser = await chatService.findUserByIdentifier(ident);
        if (!foundUser || !foundUser.email) {
          throw new Error('No registered account was found matching this Q ID or Phone Number.');
        }
        emailToSend = foundUser.email;
      }

      setResolvedForgotEmail(emailToSend);

      const res = await otpService.sendOtp(emailToSend, 'forgot_password');
      if (!res.success) {
        throw new Error(res.error || 'Failed to send reset code.');
      }

      setResendCooldown(60);
      setForgotOtp('');
      setAuthMode('verify-forgot-otp');
      setErrorMsg(null);
      setSuccessMsg(null);
    } catch (err: unknown) {
      console.error('Forgot password error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send code.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- 3. STEP 2: VERIFY FORGOT OTP & SET NEW PASSWORD ---
  const handleVerifyForgotOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = forgotOtp.trim();
    const pass = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (pass.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (pass !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const verifyRes = await otpService.verifyOtp(resolvedForgotEmail, cleanOtp);
      if (!verifyRes.success) {
        throw new Error(verifyRes.error || 'Invalid code or code has expired.');
      }

      const newHash = await otpService.hashPassword(pass);

      const updated = await chatService.updateUserPasswordHash(resolvedForgotEmail, newHash);
      if (!updated) {
        throw new Error('Failed to update password. Please try again.');
      }

      setLoginIdentifier(resolvedForgotEmail);
      setLoginPassword('');
      setAuthMode('login');
      setSuccessMsg('Your password has been reset successfully! Please log in with your new password.');
    } catch (err: unknown) {
      console.error('Reset password error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to reset password.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend Forgot Password OTP
  const handleResendForgotOtp = async () => {
    if (!resolvedForgotEmail || resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await otpService.sendOtp(resolvedForgotEmail, 'forgot_password');
      if (!res.success) {
        throw new Error(res.error || 'Failed to send code.');
      }
      setResendCooldown(60);
      setSuccessMsg(`A new 6-digit reset code was sent to ${resolvedForgotEmail}.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  // --- 4. GOOGLE SIGN IN ---
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred?.user) {
        try {
          localStorage.setItem(`qchat_verified_${cred.user.uid}`, 'true');
        } catch {
          // ignore
        }
      }
      if (onSignInSuccess) onSignInSuccess();
    } catch (err: unknown) {
      console.error('Google Sign-in error:', err);
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      if (!msg.includes('cancelled-popup-request') && !msg.includes('popup-closed-by-user')) {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto transition-colors ${
        isDayMode ? 'bg-[#F1FAF5] text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      <div className="w-full max-w-sm flex flex-col items-center my-auto py-2">
        {/* Header Branding (Ultra-clean, with inline email indication when in OTP mode) */}
        <div className="flex flex-col items-center mb-5 select-none text-center">
          <h1 className={`text-2xl font-black tracking-tight ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
            QChat
          </h1>
          {authMode === 'verify-signup-otp' ? (
            <p className="text-xs font-semibold opacity-75 mt-1">
              Code sent to <span className="text-indigo-500 font-bold">{pendingSignup?.email}</span>
            </p>
          ) : authMode === 'verify-forgot-otp' ? (
            <p className="text-xs font-semibold opacity-75 mt-1">
              Code sent to <span className="text-indigo-500 font-bold">{resolvedForgotEmail}</span>
            </p>
          ) : (
            <p className="text-[11px] font-medium opacity-60 mt-0.5">
              Secure 6-Digit Verification System
            </p>
          )}
        </div>

        {/* Tab Selector: Only show between Login and Sign Up when not in OTP/Forgot state */}
        {(authMode === 'login' || authMode === 'signup') && (
          <div
            className={`w-full p-1 rounded-2xl border flex items-center mb-4 transition-colors ${
              isDayMode ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                authMode === 'login'
                  ? `${accentConfig.primaryBg} text-white shadow-md`
                  : isDayMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                authMode === 'signup'
                  ? `${accentConfig.primaryBg} text-white shadow-md`
                  : isDayMode
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="w-full mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col space-y-2 text-xs text-red-400 animate-in fade-in">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug font-medium">{errorMsg}</span>
            </div>
            {errorMsg.includes('Sign Up') && authMode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  if (loginIdentifier) {
                    if (/^\+?\d+$/.test(loginIdentifier)) {
                      setSignupPhone(loginIdentifier.replace(/^\+/, ''));
                    } else if (loginIdentifier.includes('@')) {
                      setSignupEmail(loginIdentifier);
                    } else {
                      setSignupQid(loginIdentifier.replace(/^@/, ''));
                    }
                  }
                  switchMode('signup');
                }}
                className="mt-1 self-start px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                Create New Account
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start space-x-2 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{successMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* --- 1. LOG IN FORM (Q ID, Email, or Phone + Password) --- */}
        {/* ============================================================ */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="w-full space-y-3">
            {/* Identifier: Q ID / Email / Phone */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                User ID / Email / Phone
              </label>
              <div className="relative flex items-center">
                <AtSign className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type="text"
                  required
                  placeholder="User ID (@handle), email or phone"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold opacity-75">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    switchMode('forgot');
                    if (loginIdentifier) {
                      setForgotIdentifier(loginIdentifier);
                    }
                  }}
                  className="text-[11px] text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Log In */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 ${accentConfig.primaryBg} ${accentConfig.primaryHoverBg} active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-1`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Sign Up */}
            <div className="text-center pt-1 text-xs opacity-75">
              <span>Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Sign up here
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* --- 2. STEP 1: SIGN UP FORM (Collect details & trigger OTP) --- */}
        {/* ============================================================ */}
        {authMode === 'signup' && (
          <form onSubmit={handleInitiateSignUp} className="w-full space-y-3">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Custom Q ID */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1 flex items-center justify-between">
                <span>Choose Q ID (Optional)</span>
                <span className="text-[10px] text-indigo-400 font-normal">Unique Handle</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-indigo-400 font-bold text-xs">@</span>
                <input
                  type="text"
                  placeholder="e.g. alex (leave blank to use email handle)"
                  value={signupQid}
                  onChange={(e) => setSignupQid(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  className={`w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Phone Number with Worldwide Country Code */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Phone Number
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedCountry.country}
                  onChange={(e) => {
                    const found =
                      ALL_COUNTRIES.find((c) => c.country === e.target.value) ||
                      POPULAR_COUNTRIES.find((c) => c.country === e.target.value);
                    if (found) {
                      setSelectedCountry(found);
                    }
                  }}
                  className={`w-36 py-2.5 px-2 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0 transition-colors ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                  title="Select country code"
                >
                  <optgroup label="⭐ Popular Countries">
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={`pop-${c.country}`} value={c.country}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🌍 All Countries">
                    {ALL_COUNTRIES.map((c) => (
                      <option key={`all-${c.country}`} value={c.country}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <div className="relative flex-1 flex items-center">
                  <Phone className="w-3.5 h-3.5 absolute left-3 opacity-50" />
                  <input
                    type="tel"
                    required
                    placeholder="1712345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className={`w-full pl-8 pr-3 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                      isDayMode
                        ? 'bg-white border-emerald-200 text-slate-800'
                        : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type="email"
                  required
                  placeholder="example@gmail.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Enter at least 6 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Send OTP & Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 ${accentConfig.primaryBg} ${accentConfig.primaryHoverBg} active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-1`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>

            {/* Switch to Login */}
            <div className="text-center pt-1 text-xs opacity-75">
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Log In
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* --- 2. STEP 2: VERIFY 6-DIGIT OTP (CLEAN, NO CLUTTER) --- */}
        {/* ============================================================ */}
        {authMode === 'verify-signup-otp' && (
          <form onSubmit={handleVerifySignUpOtp} className="w-full space-y-4">
            {/* 6-Digit Code Input Box */}
            <div>
              <label className="block text-center text-xs font-semibold opacity-80 mb-2">
                Enter 6-Digit Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="• • • • • •"
                value={signupOtp}
                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`w-full py-3.5 px-4 text-center font-mono font-extrabold text-2xl tracking-[0.4em] rounded-2xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isDayMode
                    ? 'bg-white border-emerald-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
              />
            </div>

            {/* Submit Verification */}
            <button
              type="submit"
              disabled={loading || signupOtp.length !== 6}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Complete Account</span>
                </>
              )}
            </button>

            {/* Resend & Back actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendSignUpOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-indigo-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-40"
              >
                <RotateCw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="opacity-70 hover:opacity-100 flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Edit Details</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* --- 3. STEP 1: FORGOT PASSWORD (Enter Email, Q ID, or Phone) --- */}
        {/* ============================================================ */}
        {authMode === 'forgot' && (
          <form onSubmit={handleInitiateForgotPassword} className="w-full space-y-3.5">
            <div
              className={`p-3.5 rounded-2xl border text-left ${
                isDayMode
                  ? 'bg-white border-emerald-200 text-slate-800 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              <div className="flex items-center space-x-2 text-xs font-bold text-indigo-400 mb-1">
                <KeyRound className="w-4 h-4" />
                <span>Reset Password</span>
              </div>
              <p className="text-[11px] opacity-75 leading-relaxed">
                Enter your registered email, Q ID, or phone number. A 6-digit verification code will be sent to your email.
              </p>
            </div>

            {/* Identifier input */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Email, Q ID, or Phone Number
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type="text"
                  required
                  placeholder="Enter email, Q ID or phone"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Send Reset Code Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Send 6-Digit Reset Code</span>
                </>
              )}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2 text-xs opacity-75 hover:opacity-100 text-center font-medium cursor-pointer transition-opacity"
            >
              ← Back to Log In
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* --- 3. STEP 2: VERIFY FORGOT OTP & SET NEW PASSWORD (CLEAN) --- */}
        {/* ============================================================ */}
        {authMode === 'verify-forgot-otp' && (
          <form onSubmit={handleVerifyForgotOtpAndReset} className="w-full space-y-3">
            {/* 6 Digit OTP */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="• • • • • •"
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={`w-full py-2.5 px-3 text-center font-mono font-bold text-xl tracking-[0.3em] rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isDayMode
                    ? 'bg-white border-emerald-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-100'
                }`}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                New Password (min 6 characters)
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 opacity-60 hover:opacity-100 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[11px] font-semibold opacity-75 mb-1">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3.5 opacity-50" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                    isDayMode
                      ? 'bg-white border-emerald-200 text-slate-800'
                      : 'bg-slate-900 border-slate-800 text-slate-100'
                  }`}
                />
              </div>
            </div>

            {/* Submit Reset */}
            <button
              type="submit"
              disabled={loading || forgotOtp.length !== 6 || !newPassword}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save New Password</span>
                </>
              )}
            </button>

            {/* Resend & Back actions */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendForgotOtp}
                disabled={resendCooldown > 0 || loading}
                className="text-indigo-400 font-semibold hover:underline flex items-center space-x-1 cursor-pointer disabled:opacity-40"
              >
                <RotateCw className="w-3 h-3" />
                <span>
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="opacity-70 hover:opacity-100 flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Log In</span>
              </button>
            </div>
          </form>
        )}

        {/* Optional Google Sign In */}
        {authMode === 'login' && (
          <div className="w-full mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full py-2.5 px-4 font-semibold rounded-xl flex items-center justify-center space-x-2.5 shadow-sm transition-all cursor-pointer border text-xs ${
                isDayMode
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z" />
                <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.7s.1-2 .4-2.7L1.9 6.4C.7 8.8 0 10.8 0 12s.7 3.2 1.9 5.6l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.3L1.9 16C3.7 19.8 7.5 23 12 23z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
