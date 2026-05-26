import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail, Save, UserCircle, KeyRound } from 'lucide-react';
import { updateProfile } from '../store/fileThunks';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ToastContext';
import AlertModal from '../components/AlertModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import '../styles/ProfilePge.css';
import { cleanNamePart } from '../utils/userDisplay';
import { validateProfileForm } from '../utils/validation';
import DateOfBirthSelect from '../components/DateOfBirthSelect';
import ChangePasswordModal from '../components/ChangePasswordModal.jsx';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const setUser = useAuthStore((s) => s.setUser);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const rawUser = JSON.parse(localStorage.getItem('auth_user')) || {};

  const [formData, setFormData] = useState({
    firstName: rawUser.first_name || '',
    lastName: cleanNamePart(rawUser.last_name),
    email: rawUser.email || '',
    dob: rawUser.dob || '',
  });

  const [showPassModal, setShowPassModal] = useState(false);

  useBodyScrollLock(showPassModal || !!alertModal);

  const handleSave = async (e) => {
    e.preventDefault();
    const errs = validateProfileForm(formData);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const result = await dispatch(updateProfile(formData));
    setSaving(false);
    if (result.success) {
      setUser(result.data);
      showToast('Profile updated successfully');
    } else {
      setAlertModal({
        title: 'Could not save profile',
        message: result.error || 'Please check your details and try again.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="profile-wrapper">
      <div className="profile-content-card">
        <div className="profile-card-header">
          <div className="header-with-icon">
            <UserCircle size={24} className="rose-text" />
            <h2 className="welcome-titlefm">Basic Details</h2>
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-basic-form">
          <div className="form-grid-2col">
            <div className="input-group">
              <label>First Name</label>
              <input
                type="text"
                value={formData.firstName}
                className={fieldErrors.firstName ? 'input-error' : ''}
                onChange={(e) => {
                  setFieldErrors((p) => ({ ...p, firstName: '' }));
                  setFormData({ ...formData, firstName: e.target.value });
                }}
              />
              {fieldErrors.firstName && (
                <span className="field-error-text">{fieldErrors.firstName}</span>
              )}
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                className={fieldErrors.lastName ? 'input-error' : ''}
                onChange={(e) => {
                  setFieldErrors((p) => ({ ...p, lastName: '' }));
                  setFormData({ ...formData, lastName: e.target.value });
                }}
              />
              {fieldErrors.lastName && (
                <span className="field-error-text">{fieldErrors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="input-group">
              <label>Email</label>
              <div className="disabled-input-wrapper">
                <Mail size={16} color="#71717a" />
                <input type="email" value={formData.email} disabled />
              </div>
            </div>

            <div className="auth-group">
              <label className="auth-label">Date of Birth</label>
              <DateOfBirthSelect
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                name="dob"
                error={fieldErrors.dob}
              />
              {fieldErrors.dob && (
                <span className="field-error">⚠ {fieldErrors.dob}</span>
              )}
            </div>
          </div>

          <div className="form-footer-simple">
            <button type="submit" className="save-profile-btn" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="divider-line" />

        <div className="security-action-card">
          <div className="security-info">
            <KeyRound size={20} color="#a1a1aa" />
            <div>
              <div className="security-label">Account Password</div>
              <div className="security-desc">Update your login credentials</div>
            </div>
          </div>
          <button className="btn-secondary-sm" onClick={() => setShowPassModal(true)}>
            Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
      />

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        variant={alertModal?.variant}
        onClose={() => setAlertModal(null)}
      />
    </div>
  );
}