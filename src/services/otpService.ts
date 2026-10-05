export interface OtpResponse {
  success: boolean;
  message?: string;
  internalCredential?: string;
  error?: string;
}

export const otpService = {
  /**
   * Send 6-Digit OTP code via Gmail SMTP (NO LINKS, 100% English)
   */
  async sendOtp(
    email: string,
    purpose: 'register' | 'forgot_password' | 'verify' = 'register',
    userName?: string
  ): Promise<OtpResponse> {
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose, userName }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      return {
        success: false,
        error: 'Failed to send verification code. Please check your internet connection.',
      };
    }
  },

  /**
   * Verify the 6-digit numeric OTP code entered by user
   */
  async verifyOtp(email: string, code: string): Promise<OtpResponse> {
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      console.error('Failed to verify OTP:', err);
      return {
        success: false,
        error: 'Failed to verify code. Please try again.',
      };
    }
  },

  /**
   * Securely hash password for verification
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const res = await fetch('/api/hash-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      return data.hash || '';
    } catch (err) {
      // Fallback in-client SHA-256
      const msgUint8 = new TextEncoder().encode(password + '_qchat_salt');
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  },

  /**
   * Retrieve internal Firebase credential for verified email
   */
  async getAuthCredential(email: string): Promise<string> {
    try {
      const res = await fetch('/api/auth-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      return data.internalCredential || '';
    } catch {
      return '';
    }
  },
};
