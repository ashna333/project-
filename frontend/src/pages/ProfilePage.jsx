import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Mail, Save, UserCircle, Calendar, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { updateProfile, changePasswordAction } from '../store/fileThunks';
import '../styles/ProfilePge.css';
import { cleanNamePart } from '../utils/userDisplay';

export default function ProfilePage() {
  const dispatch = useDispatch();
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

  const handleSave = async (e) => {
    e.preventDefault();
    await dispatch(updateProfile(formData));
  };

  const handlePasswordSubmit = async (e) => {
  e.preventDefault();

  // Frontend check
  if (passData.new_password.length < 8) {
    alert("New password must be at least 8 characters.");
    return;
  }

  // Execute the thunk
  const result = await dispatch(changePasswordAction(passData));
  
  if (result.success) {
    alert("Password updated successfully!");
    setShowPassModal(false);
    setPassData({ old_password: '', new_password: '' });
  } else {
    // This will now show the SPECIFIC message from the backend
    // e.g., "The old password you entered is incorrect"
    alert(`Error: ${result.error}`);
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
                onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
              />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input 
                type="text" 
                value={formData.lastName} 
                onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
              />
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
            <div className="input-group">
              <label>Date of Birth</label>
              <div className="input-with-icon-wrapper">
                <Calendar size={16} color="#71717a" />
                <input 
                  type="date" 
                  value={formData.dob} 
                  onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                  className="date-input" 
                />
              </div>
            </div>
          </div>

          <div className="form-footer-simple">
            {/* Removed onClick from Save icon; the button type="submit" triggers handleSave */}
            <button type="submit" className="save-profile-btn">
              <Save size={18} /> Save Changes
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
    </div>
  );
}