/** Frontend validation — mirrors backend/fileapp/validators.py */

export const LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  MAX_FILES_PER_UPLOAD: 50,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_FILENAME_LENGTH: 255,
  MIN_PASSWORD_LENGTH: 8,
};

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z\s'\-]+$/;
const FORBIDDEN_FILENAME = /[<>:"/\\|?*\x00]/;
const PASSWORD_UPPER = /[A-Z]/;
const PASSWORD_LOWER = /[a-z]/;
const PASSWORD_DIGIT = /[0-9]/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=;:"<>?/|]/;

export function validateName(value, fieldName = 'Name', minLength = 2) {
  const v = (value || '').trim();
  if (!v) return `${fieldName} is required.`;
  if (!NAME_REGEX.test(v)) {
    return `${fieldName} should only contain letters, hyphens, or apostrophes.`;
  }
  if (v.length < minLength) return `${fieldName} must be at least ${minLength} characters.`;
  if (v.length > 50) return `${fieldName} cannot exceed 50 characters.`;
  return null;
}

export function validateEmail(value, required = true) {
  const v = (value || '').trim().toLowerCase();
  if (!v) return required ? 'Email is required.' : null;
  if (v.length > 254) return 'Email is too long.';
  if (!EMAIL_REGEX.test(v)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < LIMITS.MIN_PASSWORD_LENGTH) {
    return 'Password must be at least 8 characters.';
  }
  if (!PASSWORD_UPPER.test(value)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!PASSWORD_LOWER.test(value)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!PASSWORD_DIGIT.test(value)) return 'Password must contain at least one number.';
  if (!PASSWORD_SPECIAL.test(value)) {
    return 'Password must contain at least one special character.';
  }
  if (value !== value.trim()) {
    return 'Password cannot contain leading or trailing spaces.';
  }
  return null;
}

export function validatePasswordMatch(password, confirm) {
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}

export function validateDob(value) {
  if (!value) return 'Date of birth is required.';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return 'Enter a valid date of birth.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dob >= today) return 'Date of birth cannot be a future date.';
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  if (age < 13) return 'You must be at least 13 years old.';
  if (age > 120) return 'Please enter a valid date of birth.';
  return null;
}

export function validateFilename(value) {
  const v = (value || '').trim();
  if (!v) return 'File name cannot be empty.';
  if (v.length > LIMITS.MAX_FILENAME_LENGTH) {
    return 'File name is too long (max 255 characters).';
  }
  if (v.includes('/') || v.includes('\\')) {
    return 'File name cannot contain slashes.';
  }
  if (FORBIDDEN_FILENAME.test(v)) return 'File name contains invalid characters.';
  if (v === '.' || v === '..') return 'Invalid file name.';
  return null;
}

export function validateShareMessage(value) {
  const v = (value || '').trim();
  if (v.length > LIMITS.MAX_MESSAGE_LENGTH) {
    return `Message cannot exceed ${LIMITS.MAX_MESSAGE_LENGTH} characters.`;
  }
  return null;
}

export function validateExpiresInHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 720) {
    return 'Expiry must be between 1 and 720 hours (30 days).';
  }
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const e = validateEmail(email);
  if (e) errors.email = e;
  if (!password || !String(password).trim()) {
    errors.password = 'Password is required.';
  }
  return errors;
}

export function validateRegisterForm(form) {
  const errors = {};
  const fn = validateName(form.first_name, 'First name', 2);
  if (fn) errors.first_name = fn;
  const ln = validateName(form.last_name, 'Last name', 1);
  if (ln) errors.last_name = ln;
  const em = validateEmail(form.email);
  if (em) errors.email = em;
  const dob = validateDob(form.dob);
  if (dob) errors.dob = dob;
  const pw = validatePassword(form.password);
  if (pw) errors.password = pw;
  const match = validatePasswordMatch(form.password, form.confirm_password);
  if (match) errors.confirm_password = match;
  return errors;
}

export function validateProfileForm({ firstName, lastName, dob }) {
  const errors = {};
  const fn = validateName(firstName, 'First name', 2);
  if (fn) errors.firstName = fn;
  const ln = validateName(lastName, 'Last name', 1);
  if (ln) errors.lastName = ln;
  const d = validateDob(dob);
  if (d) errors.dob = d;
  return errors;
}

export function validateChangePassword({ old_password, new_password, confirm_new_password }) {
  const errors = {};
  if (!old_password?.trim()) errors.old_password = 'Current password is required.';
  const pw = validatePassword(new_password);
  if (pw) errors.new_password = pw;
  const match = validatePasswordMatch(new_password, confirm_new_password);
  if (match) errors.confirm_new_password = match;
  if (
    old_password &&
    new_password &&
    old_password === new_password
  ) {
    errors.new_password = 'New password must be different from the old password.';
  }
  return errors;
}

export function validateUploadFiles(fileList) {
  const errors = [];
  const valid = [];
  const list = Array.from(fileList || []);
  if (list.length === 0) return { errors: ['Select at least one file to upload.'], files: [] };
  if (list.length > LIMITS.MAX_FILES_PER_UPLOAD) {
    return {
      errors: [`You can upload at most ${LIMITS.MAX_FILES_PER_UPLOAD} files at once.`],
      files: [],
    };
  }
  for (const f of list) {
    if (f.size === 0) {
      errors.push(`"${f.name}" appears to be a folder. Upload files only.`);
      continue;
    }
    if (f.size > LIMITS.MAX_FILE_SIZE) {
      errors.push(`"${f.name}" exceeds the 100 MB limit.`);
      continue;
    }
    const nameErr = validateFilename(f.name);
    if (nameErr) {
      errors.push(`"${f.name}": ${nameErr}`);
      continue;
    }
    valid.push(f);
  }
  return { errors, files: valid };
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
