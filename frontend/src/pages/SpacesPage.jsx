import React, { useEffect, useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import { fetchSpacesApi, createSpaceApi } from '../store/spacesApi';

import '../styles/DashboardPage.css';

export default function SpacesPage() {
  const { showToast } = useToast();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const { data } = await fetchSpacesApi();
      setSpaces(data?.spaces || []);
    } catch (e) {
      showToast('Failed to load spaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a space name.');
      return;
    }

    setSubmitting(true);
    try {
      const emails = inviteEmails
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        invite_emails: emails,
        role_by_email: {}, // MVP: everyone invited as viewer (edit later)
      };

      await createSpaceApi(payload);
      showToast('Space created.');
      setName('');
      setInviteEmails('');
      setDescription('');
      await loadSpaces();
    } catch (err) {
      showToast('Failed to create space.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="dashboard-main fade-in">
      <div className="file-manager-header">
        <div className="welcome-sectionfm">
          <div className="welcome-labelfm">Collaborative Workspaces</div>
          <h1 className="welcome-titlefm">Spaces</h1>
          <p style={{ color: '#71717a' }}>Invite-only rooms for files, threads, and tasks</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <section className="file-list-container" style={{ margin: 0 }}>
          {loading ? (
            <div className="fm-empty-state">
              <div className="fm-spinner" />
            </div>
          ) : spaces.length === 0 ? (
            <div className="fm-empty-state">
              <Layers size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>No spaces yet</h2>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {spaces.map((s) => (
                <button
                  key={s.id}
                  className="ps-card"
                  style={{ cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => (window.location.href = `/spaces/${s.id}`)}
                >
                  <div className="ps-card-top">
                    <h3 style={{ margin: 0 }}>{s.name}</h3>
                  </div>
                  <div style={{ color: '#71717a', fontSize: 13, lineHeight: 1.5 }}>
                    {s.description ? s.description : 'No description'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="ps-card" style={{ padding: 18 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Plus size={18} />
              <strong style={{ color: 'white' }}>Create Space</strong>
            </div>

            <label style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginBottom: 6 }}>
              Space name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="modal-input"
              placeholder="e.g. Design Team"
              style={{ width: '100%' }}
            />

            <label style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginTop: 12, marginBottom: 6 }}>
              Invite by email (comma separated)
            </label>
            <input
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              className="modal-input"
              placeholder="a@company.com, b@company.com"
              style={{ width: '100%' }}
            />

            <label style={{ color: '#a1a1aa', fontSize: 13, display: 'block', marginTop: 12, marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="modal-textarea"
              placeholder="What is this space for?"
              style={{ width: '100%', height: 90 }}
            />

            <button
              type="submit"
              className="share-submit-btn"
              style={{ width: '100%', marginTop: 14 }}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}

