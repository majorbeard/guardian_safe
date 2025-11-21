// OTP validation
export function validateOTP(otp: string): { valid: boolean; error?: string } {
  if (!otp || typeof otp !== "string") {
    return { valid: false, error: "OTP is required" };
  }

  const cleaned = otp.trim();

  if (!/^\d{6}$/.test(cleaned)) {
    return { valid: false, error: "OTP must be exactly 6 digits" };
  }

  return { valid: true };
}

// Username validation
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: "Username is too long" };
  }

  return { valid: true };
}

// Password validation
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 4) {
    return { valid: false, error: "Password must be at least 4 characters" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password is too long" };
  }

  return { valid: true };
}

// Sanitize text input
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text.trim().slice(0, maxLength).replace(/[<>]/g, ""); // Remove angle brackets
}
