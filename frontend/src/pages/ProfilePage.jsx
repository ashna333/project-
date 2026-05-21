import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail, Save, UserCircle, Calendar, KeyRound, Eye, EyeOff } from 'lucide-react';
import { updateProfile, changePasswordAction } from '../store/fileThunks';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/ToastContext';
import AlertModal from '../components/AlertModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import '../styles/ProfilePge.css';
import { cleanNamePart } from '../utils/userDisplay';
import {
  validateProfileForm,
  validateChangePassword,
} from '../utils/validation';
 import DateOfBirthSelect from '../components/DateOfBirthSelect';


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

  // --- PASSWORD STATES (ADDED THESE) ---
  const [passData, setPassData] = useState({
  old_password: '',
  new_password: '',
  confirm_new_password: ''
});
  const [showPassModal, setShowPassModal] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false); // Fix for old password toggle
  const [showNewPass, setShowNewPass] = useState(false); // Fix for new password toggle

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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const pwErrs = validateChangePassword(passData);
    if (Object.keys(pwErrs).length > 0) {
      const first = Object.values(pwErrs)[0];
      setAlertModal({
        title: 'Invalid password',
        message: first,
        variant: 'error',
      });
      return;
    }
    const result = await dispatch(changePasswordAction(passData));
    if (result.success) {
      showToast('Password updated successfully');
      setShowPassModal(false);
      setPassData({ old_password: '', new_password: '', confirm_new_password: '' });
    } else {
      setAlertModal({
        title: 'Password change failed',
        message: result.error,
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
              {fieldErrors.firstName && <span className="field-error-text">{fieldErrors.firstName}</span>}
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
              {fieldErrors.lastName && <span className="field-error-text">{fieldErrors.lastName}</span>}
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
     onChange={(e) => {
                  // setFieldErrors((p) => ({ ...p, lastName: '' }));
                  setFormData({ ...formData, dob: e.target.value });
                }}
    name="dob"
    error={fieldErrors.dob}
  />
  {fieldErrors.dob && <span className="field-error">⚠ {fieldErrors.dob}</span>}
</div>
          </div>

          <div className="form-footer-simple">
            {/* Removed onClick from Save icon; the button type="submit" triggers handleSave */}
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

      {/* PASSWORD MODAL */}
      {showPassModal && (
        <div className="modal-overlaydelete" style={{ zIndex: 10000 }}>
          <div className="modal-content">
            <h3 className="modal-title">Change Password</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="input-group" style={{ marginTop: '20px' }}>
                <label>Old Password</label>
                <div className="password-input-container">
                  <input 
                    type={showOldPass ? "text" : "password"} 
                    required 
                    placeholder="Enter current password"
                    value={passData.old_password}
                    onChange={(e) => setPassData({...passData, old_password: e.target.value})} 
                  />
                  <div className="eye-icon" onClick={() => setShowOldPass(!showOldPass)}>
                    {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>New Password</label>
                <div className="password-input-container">
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    required 
                    placeholder="Minimum 8 characters"
                    value={passData.new_password}
                    onChange={(e) => setPassData({...passData, new_password: e.target.value})} 
                  />
                  <div className="eye-icon" onClick={() => setShowNewPass(!showNewPass)}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </div>
                </div>
              </div>
              <div className="input-group">
  <label>Confirm New Password</label>
  <div className="password-input-container">
    <input
      type={showNewPass ? "text" : "password"}
      required
      placeholder="Re-enter new password"
      value={passData.confirm_new_password}
      onChange={(e) =>
        setPassData({
          ...passData,
          confirm_new_password: e.target.value
        })
      }
    />
  </div>
</div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPassModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-profile-btn">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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