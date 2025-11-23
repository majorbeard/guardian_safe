// Email validation
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Email cannot be empty" };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: "Email is too long" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true };
}

// Phone validation (South African numbers)
export function validatePhone(phone: string): {
  valid: boolean;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "Phone number is required" };
  }

  const cleaned = phone.replace(/[\s\-\(\)]/g, "");

  const southAfricanPatterns = [
    /^0[7-8][0-9]\d{7}$/,
    /^0[1-6]\d{8}$/,
    /^\+27[7-8][0-9]\d{7}$/,
    /^\+27[1-6]\d{8}$/,
    /^27[7-8][0-9]\d{7}$/,
    /^27[1-6]\d{8}$/,
  ];

  const isValid = southAfricanPatterns.some((pattern) => pattern.test(cleaned));

  if (!isValid) {
    return { valid: false, error: "Invalid South African phone number" };
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

  if (trimmed.length > 30) {
    return { valid: false, error: "Username must be less than 30 characters" };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error:
        "Username can only contain letters, numbers, underscores and hyphens",
    };
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

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password is too long" };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: "Password must contain both letters and numbers",
    };
  }

  const commonPasswords = [
    "password",
    "12345678",
    "qwerty",
    "abc12345",
    "password123",
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: "Password is too common" };
  }

  return { valid: true };
}

// Safe serial number validation
export function validateSerialNumber(serial: string): {
  valid: boolean;
  error?: string;
} {
  if (!serial || typeof serial !== "string") {
    return { valid: false, error: "Serial number is required" };
  }

  const trimmed = serial.trim().toUpperCase();

  if (trimmed.length < 3 || trimmed.length > 50) {
    return {
      valid: false,
      error: "Serial number must be between 3 and 50 characters",
    };
  }

  if (!/^[A-Z0-9-_]+$/.test(trimmed)) {
    return {
      valid: false,
      error:
        "Serial number can only contain letters, numbers, hyphens and underscores",
    };
  }

  return { valid: true };
}

// Address validation
export function validateAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  if (!address || typeof address !== "string") {
    return { valid: false, error: "Address is required" };
  }

  const trimmed = address.trim();

  if (trimmed.length < 10) {
    return {
      valid: false,
      error: "Address is too short (minimum 10 characters)",
    };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: "Address is too long (maximum 500 characters)",
    };
  }

  return { valid: true };
}

// Generic text sanitization
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text.trim().slice(0, maxLength).replace(/[<>]/g, ""); // Remove angle brackets to prevent XSS
}

// Date validation
export function validateDateTime(dateString: string): {
  valid: boolean;
  error?: string;
} {
  if (!dateString || typeof dateString !== "string") {
    return { valid: false, error: "Date is required" };
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  // Check if date is too far in the past (more than 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (date < oneYearAgo) {
    return {
      valid: false,
      error: "Date cannot be more than 1 year in the past",
    };
  }

  // Check if date is too far in the future (more than 1 year)
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  if (date > oneYearFromNow) {
    return {
      valid: false,
      error: "Date cannot be more than 1 year in the future",
    };
  }

  return { valid: true };
}

// UUID validation
export function validateUUID(uuid: string): { valid: boolean; error?: string } {
  if (!uuid || typeof uuid !== "string") {
    return { valid: false, error: "ID is required" };
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    return { valid: false, error: "Invalid ID format" };
  }

  return { valid: true };
}

// Comprehensive validation for trip creation
export interface TripValidationErrors {
  safe_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  pickup_address?: string;
  delivery_address?: string;
  scheduled_pickup?: string;
  scheduled_delivery?: string;
  recipient_email?: string;
}

export function validateTripData(data: any): {
  valid: boolean;
  errors: TripValidationErrors;
  sanitized?: any;
} {
  const errors: TripValidationErrors = {};

  // Validate safe_id
  const safeIdValidation = validateUUID(data.safe_id);
  if (!safeIdValidation.valid) {
    errors.safe_id = safeIdValidation.error;
  }

  // Validate client_name
  if (!data.client_name || data.client_name.trim().length < 2) {
    errors.client_name = "Client name must be at least 2 characters";
  }

  // Validate email - REQUIRED for OTP delivery
  // Either client_email (if recipient_is_client) or recipient_email must be valid
  if (data.recipient_is_client) {
    // Client is recipient - client_email is required
    if (!data.client_email) {
      errors.client_email = "Client email is required for OTP delivery";
    } else {
      const emailValidation = validateEmail(data.client_email);
      if (!emailValidation.valid) {
        errors.client_email = emailValidation.error;
      }
    }
  } else {
    // Different recipient - recipient_email is required
    if (!data.recipient_email) {
      errors.recipient_email = "Recipient email is required for OTP delivery";
    } else {
      const recipientEmailValidation = validateEmail(data.recipient_email);
      if (!recipientEmailValidation.valid) {
        errors.recipient_email = recipientEmailValidation.error;
      }
    }
  }

  // Validate client_phone (optional but must be valid if provided)
  if (data.client_phone) {
    const phoneValidation = validatePhone(data.client_phone);
    if (!phoneValidation.valid) {
      errors.client_phone = phoneValidation.error;
    }
  }

  // Validate addresses
  const pickupValidation = validateAddress(data.pickup_address);
  if (!pickupValidation.valid) {
    errors.pickup_address = pickupValidation.error;
  }

  const deliveryValidation = validateAddress(data.delivery_address);
  if (!deliveryValidation.valid) {
    errors.delivery_address = deliveryValidation.error;
  }

  // Validate dates
  const pickupDateValidation = validateDateTime(data.scheduled_pickup);
  if (!pickupDateValidation.valid) {
    errors.scheduled_pickup = pickupDateValidation.error;
  }

  const deliveryDateValidation = validateDateTime(data.scheduled_delivery);
  if (!deliveryDateValidation.valid) {
    errors.scheduled_delivery = deliveryDateValidation.error;
  }

  // Validate pickup is before delivery
  if (pickupDateValidation.valid && deliveryDateValidation.valid) {
    const pickupDate = new Date(data.scheduled_pickup);
    const deliveryDate = new Date(data.scheduled_delivery);

    if (deliveryDate <= pickupDate) {
      errors.scheduled_delivery = "Delivery time must be after pickup time";
    }

    const minDuration = 30 * 60 * 1000; // 30 minutes
    if (deliveryDate.getTime() - pickupDate.getTime() < minDuration) {
      errors.scheduled_delivery = "Minimum trip duration is 30 minutes";
    }
  }

  const valid = Object.keys(errors).length === 0;

  // Return sanitized data if valid
  if (valid) {
    return {
      valid: true,
      errors: {},
      sanitized: {
        ...data,
        client_name: sanitizeText(data.client_name, 100),
        client_email: data.client_email?.trim().toLowerCase(),
        client_phone: data.client_phone?.replace(/[\s\-\(\)]/g, ""),
        pickup_address: sanitizeText(data.pickup_address, 500),
        delivery_address: sanitizeText(data.delivery_address, 500),
        special_instructions: sanitizeText(
          data.special_instructions || "",
          1000
        ),
        delivery_notes: sanitizeText(data.delivery_notes || "", 500),
        pickup_contact_name: sanitizeText(data.pickup_contact_name || "", 100),
        delivery_contact_name: sanitizeText(
          data.delivery_contact_name || "",
          100
        ),
        recipient_name: sanitizeText(data.recipient_name || "", 100),
        recipient_email: data.recipient_email?.trim().toLowerCase(),
      },
    };
  }

  return { valid, errors };
}
