import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import {
  fetchSpaceMembersApi,
  fetchSpaceFilesApi,
  fetchSpaceThreadsApi,
  fetchSpaceTasksApi,
  createSpaceThreadApi,
  resolveSpaceThreadApi,
  addSpaceThreadCommentApi,
  fetchSpaceThreadCommentsApi,
  uploadSpaceFilesApi,
  createSpaceTaskApi,
  fetchUnresolvedThreadsApi,
  presenceHeartbeatApi,
  fetchSpaceVersionsApi,
  restoreSpaceFileVersionApi,
  pinSpaceFileApi,
  pinSpaceFileVersionApi,
  fetchMySpaceMuteApi,
  setMySpaceMuteApi,
} from '../store/spacesApi';

import '../styles/DashboardPage.css';

export default function SpaceDetailPage() {
  const { spaceId } = useParams();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [files, setFiles] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [activeThreadComments, setActiveThreadComments] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [selectedFileId, setSelectedFileId] = useState(null);
  const [activeTab, setActiveTab] = useState('files'); // files | threads | tasks

  // Versions timeline state
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [restoringVersionId, setRestoringVersionId] = useState(null);
  const [pinningVersionId, setPinningVersionId] = useState(null);
  const [pinningFile, setPinningFile] = useState(false);

  // Upload state
  const [uploadNote, setUploadNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState([]);

  // Thread state
  const [newThreadContent, setNewThreadContent] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState([]);
  const [mentionPickId, setMentionPickId] = useState(null);

  // Drafts: for thread top-level comment and replies
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyToCommentId, setReplyToCommentId] = useState(null);

  // Tasks state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueAt, setTaskDueAt] = useState('');
  const [taskPriority, setTaskPriority] = useState(2);
  const [taskAssigneeId, setTaskAssigneeId] = useState(null);
  const [taskDescription, setTaskDescription] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Mute controls
  const [muteInApp, setMuteInApp] = useState(false);
  const [muteWeeklyDigest, setMuteWeeklyDigest] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  const memberMap = useMemo(() => {
    const m = {};
    members.forEach((x) => (m[x.user_id || x.user?.id || x.user] = x));
    return m;
  }, [members]);

  const selectedFile = useMemo(
    () => files.find((f) => String(f.id) === String(selectedFileId)) || null,
    [files, selectedFileId]
  );

  const loadVersions = async (fileId) => {
    if (!fileId) return;
    setVersionsLoading(true);
    try {
      const { data } = await fetchSpaceVersionsApi(spaceId, fileId);
      setVersions(data?.versions || []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const refreshAll = async () => {
  setLoading(true);
  try {
    const [membersRes, filesRes] = await Promise.all([
      fetchSpaceMembersApi(spaceId),
      fetchSpaceFilesApi(spaceId),
    ]);
    setMembers(membersRes.data?.members || []);
    const nextFiles = filesRes.data?.files || [];
    setFiles(nextFiles);
    const first = nextFiles[0]?.id || null;
    // Always update selectedFileId after upload so versions load correctly
    setSelectedFileId((cur) => cur || first);
  } catch (e) {
    showToast('Failed to load space.');
  } finally {
    setLoading(false);
  }
};

  const refreshThreadsAndTasks = async (fileId) => {
    if (!fileId) return;
    try {
      const [threadsRes, tasksRes] = await Promise.all([
        fetchSpaceThreadsApi(spaceId, fileId),
        fetchSpaceTasksApi(spaceId, {}),
      ]);
      setThreads(threadsRes.data?.threads || []);
      const allTasks = tasksRes.data?.tasks || [];
      setTasks(allTasks.filter((t) => String(t.space_file) === String(fileId)));
      // Close active thread when changing file.
      setActiveThreadId(null);
      setActiveThread(null);
      setActiveThreadComments([]);
      setReplyToCommentId(null);
    } catch (e) {
      showToast('Failed to load threads/tasks.');
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);

  useEffect(() => {
    const loadMute = async () => {
      try {
        const { data } = await fetchMySpaceMuteApi(spaceId);
        setMuteInApp(!!data?.mute_in_app);
        setMuteWeeklyDigest(!!data?.mute_weekly_digest);
      } catch {}
    };
    loadMute();
  }, [spaceId]);

  useEffect(() => {
    refreshThreadsAndTasks(selectedFileId);
    if (activeTab === 'files') loadVersions(selectedFileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

  useEffect(() => {
    if (activeTab === 'files') loadVersions(selectedFileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Presence (heartbeat only, MVP)
  useEffect(() => {
    const tick = async () => {
      try {
        await presenceHeartbeatApi(spaceId);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [spaceId]);

const handleUpload = async () => {
  if (!pendingUploadFiles.length) {
    showToast('Pick files to upload.');
    return;
  }
  console.log('pendingUploadFiles:', pendingUploadFiles) // ← add this
  console.log('files length:', pendingUploadFiles.length)
  // ← remove the selectedFileId check here, it blocks first uploads

  setUploading(true);
  try {
    await uploadSpaceFilesApi(spaceId, pendingUploadFiles, { change_note: uploadNote });
    showToast('Uploaded to Space.');
    setPendingUploadFiles([]);
    setUploadNote('');
    await refreshAll();
    // Only load versions if a file is selected (may now be set after refreshAll)
    if (selectedFileId) await loadVersions(selectedFileId);
  } catch (e) {
    showToast('Upload failed.');
  } finally {
    setUploading(false);
  }
};

  const handleRestoreVersion = async (versionId) => {
    if (!selectedFileId) return;
    setRestoringVersionId(versionId);
    try {
      await restoreSpaceFileVersionApi(spaceId, selectedFileId, versionId);
      showToast('Version restored.');
      await refreshAll();
      await loadVersions(selectedFileId);
    } catch {
      showToast('Failed to restore version.');
    } finally {
      setRestoringVersionId(null);
    }
  };

  const handlePinVersion = async (versionId) => {
    if (!selectedFileId) return;
    setPinningVersionId(versionId);
    try {
      await pinSpaceFileVersionApi(spaceId, selectedFileId, versionId);
      showToast('Pinned version updated.');
      await refreshAll();
    } catch {
      showToast('Failed to pin version.');
    } finally {
      setPinningVersionId(null);
    }
  };

  const handleTogglePinFile = async () => {
    if (!selectedFileId) return;
    setPinningFile(true);
    try {
      await pinSpaceFileApi(spaceId, selectedFileId);
      await refreshAll();
    } catch {
      showToast('Failed to pin file.');
    } finally {
      setPinningFile(false);
    }
  };

  const handlePickMention = () => {
    if (!mentionPickId) return;
    const idNum = Number(mentionPickId);
    if (mentionUserIds.includes(idNum)) return;
    setMentionUserIds((prev) => [...prev, idNum]);
    const member = members.find((x) => Number(x.user) === idNum);
    const display = member ? (member.display_name || '') : '';
    if (display) setNewThreadContent((prev) => `${prev}${prev.trim().length ? ' ' : ''}@${display} `);
  };

  const handleCreateThread = async () => {
    if (!selectedFileId) {
      showToast('Select a file.');
      return;
    }
    if (!newThreadContent.trim()) {
      showToast('Write a comment first.');
      return;
    }
    try {
      const payload = {
        space_file_id: selectedFileId,
        content: newThreadContent,
        mention_user_ids: mentionUserIds,
      };
      await createSpaceThreadApi(spaceId, selectedFileId, payload);
      setNewThreadContent('');
      setMentionUserIds([]);
      setMentionPickId(null);
      await refreshThreadsAndTasks(selectedFileId);
      showToast('Thread created.');
    } catch (e) {
      showToast('Failed to create thread.');
    }
  };

  const handleToggleResolve = async (thread) => {
    try {
      await resolveSpaceThreadApi(spaceId, thread.id, !thread.is_resolved);
      await refreshThreadsAndTasks(selectedFileId);
    } catch (e) {
      showToast('Failed to update thread.');
    }
  };

  const loadActiveThread = async (threadId) => {
    try {
      const res = await fetchSpaceThreadCommentsApi(spaceId, threadId);
      setActiveThreadId(threadId);
      setActiveThread(res.data?.thread || null);
      setActiveThreadComments(res.data?.comments || []);
      setReplyToCommentId(null);
      setCommentDrafts((prev) => ({ ...prev, [threadId]: prev[threadId] || '' }));
    } catch (e) {
      showToast('Failed to load thread comments.');
    }
  };

  const handleAddComment = async () => {
    if (!activeThreadId) return;
    const key = replyToCommentId ? `${activeThreadId}:${replyToCommentId}` : `${activeThreadId}:root`;
    const draft = commentDrafts[key] || '';
    if (!draft.trim()) return;

    try {
      const payload = { content: draft.trim() };
      if (replyToCommentId) payload.parent_comment_id = replyToCommentId;

      await addSpaceThreadCommentApi(spaceId, activeThreadId, payload);

      // Clear drafts and reload
      setCommentDrafts((prev) => ({
        ...prev,
        [key]: '',
      }));
      await loadActiveThread(activeThreadId);
      await refreshThreadsAndTasks(selectedFileId);
      showToast('Comment added.');
    } catch (e) {
      showToast('Failed to add comment.');
    }
  };

  const handleCreateTask = async () => {
    if (!selectedFileId) {
      showToast('Select a file.');
      return;
    }
    if (!taskTitle.trim()) {
      showToast('Task title required.');
      return;
    }
    setCreatingTask(true);
    try {
      const payload = {
        space_file_id: selectedFileId,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
        priority: Number(taskPriority),
        assignee_id: taskAssigneeId ? Number(taskAssigneeId) : null,
      };
      await createSpaceTaskApi(spaceId, selectedFileId, payload);
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueAt('');
      setTaskPriority(2);
      setTaskAssigneeId(null);
      await refreshThreadsAndTasks(selectedFileId);
    } catch (e) {
      showToast('Failed to create task.');
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading) {
    return (
      <main className="dashboard-main fade-in">
        <div className="fm-empty-state">
          <div className="fm-spinner" />
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-main fade-in">
      <div className="file-manager-header">
        <div className="welcome-sectionfm">
          <div className="welcome-labelfm">Collaborative Workspaces</div>
          <h1 className="welcome-titlefm">Space {spaceId}</h1>
          <p style={{ color: '#71717a' }}>
            {files.length} file(s) · {threads.filter((t) => !t.is_resolved).length} unresolved thread(s)
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <section className="file-list-container" style={{ margin: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <button className={`p-btn ${activeTab === 'files' ? 'active-btn' : ''}`} onClick={() => setActiveTab('files')}>
              Files
            </button>
            <button className={`p-btn ${activeTab === 'threads' ? 'active-btn' : ''}`} onClick={() => setActiveTab('threads')}>
              Threads
            </button>
            <button className={`p-btn ${activeTab === 'tasks' ? 'active-btn' : ''}`} onClick={() => setActiveTab('tasks')}>
              Tasks
            </button>
          </div>

{activeTab === 'files' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

    {/* Upload bar */}
    <div style={{
      background: '#111113',
      border: '1px solid #27272a',
      borderRadius: 14,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, color: '#52525b', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
        Upload new version
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#1c1c1f', border: '1px solid #3f3f46',
          borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
          fontSize: 13, color: '#a1a1aa', flexShrink: 0,
          transition: 'border-color .15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#71717a'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#3f3f46'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {pendingUploadFiles.length > 0 ? `${pendingUploadFiles.length} file${pendingUploadFiles.length > 1 ? 's' : ''} selected` : 'Choose files'}
          <input type="file" multiple style={{ display: 'none' }}
            onChange={(e) => setPendingUploadFiles(Array.from(e.target.files || []))} />
        </label>

        <input
          value={uploadNote}
          onChange={(e) => setUploadNote(e.target.value)}
          placeholder="Add a change note… (optional)"
          style={{
            flex: 1, minWidth: 180,
            background: '#1c1c1f', border: '1px solid #3f3f46',
            borderRadius: 8, padding: '8px 14px',
            fontSize: 13, color: '#e4e4e7',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#e11d48'}
          onBlur={e => e.target.style.borderColor = '#3f3f46'}
        />

        <button
          onClick={handleUpload}
          disabled={uploading || !pendingUploadFiles.length}
          style={{
            background: uploading || !pendingUploadFiles.length ? '#1c1c1f' : '#e11d48',
            border: '1px solid ' + (uploading || !pendingUploadFiles.length ? '#3f3f46' : '#e11d48'),
            borderRadius: 8, padding: '8px 18px',
            fontSize: 13, fontWeight: 600, color: uploading || !pendingUploadFiles.length ? '#52525b' : 'white',
            cursor: uploading || !pendingUploadFiles.length ? 'not-allowed' : 'pointer',
            flexShrink: 0, transition: 'all .15s',
          }}
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>

    {/* Files grid + version panel */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

      {/* File list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {files.length === 0 ? (
          <div style={{
            background: '#111113', border: '1px dashed #27272a',
            borderRadius: 14, padding: '48px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
            <div style={{ color: '#52525b', fontSize: 13 }}>No files yet. Upload the first one above.</div>
          </div>
        ) : files.map((f) => {
          const isSelected = String(selectedFileId) === String(f.id);
          const ext = f.display_name.split('.').pop().toLowerCase();
          const iconColor = {
            pdf: '#f97316', png: '#3b82f6', jpg: '#3b82f6', jpeg: '#3b82f6',
            mp4: '#a855f7', mp3: '#a855f7', fig: '#22c55e',
            xlsx: '#22c55e', xls: '#22c55e', doc: '#3b82f6', docx: '#3b82f6',
          }[ext] || '#71717a';

          const fileEmoji = {
            pdf: '📄', png: '🖼', jpg: '🖼', jpeg: '🖼',
            mp4: '🎬', mp3: '🎵', fig: '🎨',
            xlsx: '📊', xls: '📊', doc: '📝', docx: '📝',
          }[ext] || '📁';

          return (
            <button
              key={f.id}
              onClick={() => setSelectedFileId(f.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: isSelected ? '#1a0a0e' : '#111113',
                border: `1px solid ${isSelected ? '#e11d48' : '#27272a'}`,
                borderRadius: 12, padding: '12px 16px',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#3f3f46' }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#27272a' }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: iconColor + '18',
                border: `1px solid ${iconColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {fileEmoji}
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'white',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {f.is_pinned && <span style={{ fontSize: 11 }}>📌</span>}
                  {f.display_name}
                </div>
                <div style={{ fontSize: 12, color: '#52525b', marginTop: 3 }}>
                  {f.current_version
                    ? `v${f.current_version.version_number} · uploaded by ${f.current_version.uploaded_by_name || 'unknown'}`
                    : 'No versions yet'}
                  {f.pinned_version && f.pinned_version.id !== f.current_version?.id
                    ? <span style={{ marginLeft: 8, color: '#3f3f46' }}>· pinned v{f.pinned_version.version_number}</span>
                    : null}
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: '#1c1c1f', border: '1px solid #3f3f46',
                  color: '#71717a', padding: '3px 8px', borderRadius: 6,
                }}>
                  v{f.current_version?.version_number ?? '—'}
                </span>
                {isSelected && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    background: '#e11d4815', border: '1px solid #e11d4840',
                    color: '#e11d48', padding: '3px 8px', borderRadius: 6,
                  }}>
                    selected
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Version timeline panel */}
      <div style={{
        background: '#111113', border: '1px solid #27272a',
        borderRadius: 14, padding: '16px', position: 'sticky', top: 16,
      }}>
        {!selectedFile ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗂</div>
            <div style={{ color: '#3f3f46', fontSize: 13 }}>Select a file to view its version history</div>
          </div>
        ) : (
          <>
            {/* File header */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#52525b', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                Selected file
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', wordBreak: 'break-all', lineHeight: 1.4, marginBottom: 10 }}>
                {selectedFile.display_name}
              </div>
              <button
                onClick={handleTogglePinFile}
                disabled={pinningFile}
                style={{
                  background: 'none', border: '1px solid #3f3f46',
                  borderRadius: 7, padding: '5px 12px',
                  fontSize: 12, color: '#71717a', cursor: 'pointer',
                  width: '100%', transition: 'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#71717a'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.color = '#71717a'; }}
              >
                {selectedFile.is_pinned ? '📌 Unpin file' : '📌 Pin file'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid #1f1f22', paddingTop: 14 }}>
              <div style={{ fontSize: 11, color: '#52525b', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Version timeline
              </div>

              {versionsLoading ? (
                <div style={{ color: '#3f3f46', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>Loading…</div>
              ) : versions.length === 0 ? (
                <div style={{ color: '#3f3f46', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>No versions yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto', paddingRight: 2 }}>
                  {versions.map((v) => {
                    const isCurrent = Number(selectedFile.current_version?.id) === Number(v.id);
                    const isPinned = Number(selectedFile.pinned_version?.id) === Number(v.id);
                    return (
                      <div key={v.id} style={{
                        background: isCurrent ? '#0f1a0f' : '#18181b',
                        border: `1px solid ${isCurrent ? '#16a34a40' : '#27272a'}`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700,
                              color: isCurrent ? '#4ade80' : '#71717a',
                            }}>
                              v{v.version_number}
                            </span>
                            {isCurrent && (
                              <span style={{ fontSize: 10, fontWeight: 600, background: '#16a34a20', border: '1px solid #16a34a40', color: '#4ade80', padding: '1px 6px', borderRadius: 4 }}>
                                current
                              </span>
                            )}
                            {isPinned && (
                              <span style={{ fontSize: 10, fontWeight: 600, background: '#78350f20', border: '1px solid #78350f40', color: '#fb923c', padding: '1px 6px', borderRadius: 4 }}>
                                pinned
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 5 }}>
                            <button
                              onClick={() => handlePinVersion(v.id)}
                              disabled={pinningVersionId === v.id}
                              style={{
                                fontSize: 10, fontWeight: 600,
                                background: 'none', border: '1px solid #3f3f46',
                                borderRadius: 5, padding: '3px 7px',
                                color: '#71717a', cursor: 'pointer',
                              }}
                            >
                              {pinningVersionId === v.id ? '…' : 'Pin'}
                            </button>
                            <button
                              onClick={() => handleRestoreVersion(v.id)}
                              disabled={isCurrent || restoringVersionId === v.id}
                              style={{
                                fontSize: 10, fontWeight: 600,
                                background: isCurrent ? 'none' : '#e11d4815',
                                border: `1px solid ${isCurrent ? '#27272a' : '#e11d4840'}`,
                                borderRadius: 5, padding: '3px 7px',
                                color: isCurrent ? '#3f3f46' : '#e11d48',
                                cursor: isCurrent ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isCurrent ? 'Active' : restoringVersionId === v.id ? '…' : 'Restore'}
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#52525b', lineHeight: 1.5 }}>
                          {v.uploaded_by_name || 'Unknown'}
                          {v.created_at ? ` · ${new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                        {v.change_note ? (
                          <div style={{ fontSize: 11, color: '#71717a', marginTop: 5, fontStyle: 'italic' }}>
                            "{v.change_note}"
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  </div>
)}
          {activeTab === 'threads' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: '#a1a1aa', fontSize: 13 }}>Create a new thread</label>
                <textarea
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  className="modal-textarea"
                  style={{ width: '100%', height: 90, marginTop: 8 }}
                  placeholder="Write a comment… You can add @mentions using the member picker."
                />

                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={mentionPickId || ''}
                    onChange={(e) => setMentionPickId(e.target.value)}
                    className="modal-input"
                    style={{ width: 220 }}
                  >
                    <option value="">Mention member…</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.user}>
                        {m.display_name || m.user?.email || m.user}
                      </option>
                    ))}
                  </select>
                  <button className="p-btn" type="button" style={{ padding: '8px 14px' }} onClick={handlePickMention}>
                    Add mention
                  </button>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {mentionUserIds.map((id) => {
                    const m = members.find((x) => Number(x.user) === id);
                    const label = m ? m.display_name || m.user?.email : String(id);
                    return (
                      <span key={id} style={{ background: '#27272a', border: '1px solid #3f3f46', color: '#e4e4e7', padding: '4px 10px', borderRadius: 999 }}>
                        @{label}
                      </span>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="share-submit-btn" onClick={handleCreateThread}>
                    Create thread
                  </button>
                </div>
              </div>

              {threads.length === 0 ? (
                <div className="fm-empty-state">
                  <div style={{ color: '#71717a' }}>No threads yet for this file.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {threads.map((t) => (
                      <div key={t.id} className="ps-card" style={{ padding: 16, cursor: 'pointer', borderColor: String(activeThreadId) === String(t.id) ? '#e11d48' : '#27272a' }}
                        onClick={() => loadActiveThread(t.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ color: '#a1a1aa', fontSize: 12 }}>
                              {t.is_resolved ? 'Resolved' : 'Unresolved'} · {t.created_by_name}
                            </div>
                            <div style={{ marginTop: 6, color: 'white', fontWeight: 600 }}>
                              Latest: {t.latest_comment?.content_preview || '—'}
                            </div>
                          </div>
                          <button
                            className="p-btn"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleResolve(t); }}
                            style={{ padding: '8px 14px', flexShrink: 0 }}
                          >
                            {t.is_resolved ? 'Reopen' : 'Resolve'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ps-card" style={{ padding: 16 }}>
                    {!activeThreadId ? (
                      <div style={{ color: '#71717a', fontSize: 13 }}>Select a thread to view comments.</div>
                    ) : (
                      <>
                        <div style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 8 }}>
                          {activeThread?.is_resolved ? 'Resolved' : 'Unresolved'} · {activeThread?.id}
                        </div>
                        <div style={{ display: 'grid', gap: 12, maxHeight: 520, overflow: 'auto', paddingRight: 6 }}>
                          <ThreadCommentsTree
                            comments={activeThreadComments}
                            replyToCommentId={replyToCommentId}
                            setReplyToCommentId={setReplyToCommentId}
                            commentDrafts={commentDrafts}
                            setCommentDrafts={setCommentDrafts}
                            activeThreadId={activeThreadId}
                          />
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <textarea
                            className="modal-textarea"
                            style={{ width: '100%', height: 74 }}
                            value={commentDrafts[replyToCommentId ? `${activeThreadId}:${replyToCommentId}` : `${activeThreadId}:root`] || ''}
                            onChange={(e) => {
                              const key = replyToCommentId ? `${activeThreadId}:${replyToCommentId}` : `${activeThreadId}:root`;
                              setCommentDrafts((prev) => ({ ...prev, [key]: e.target.value }));
                            }}
                            placeholder={replyToCommentId ? 'Write a reply…' : 'Write a reply to the thread…'}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 10 }}>
                            {replyToCommentId && (
                              <button className="p-btn" type="button" style={{ padding: '8px 14px' }} onClick={() => setReplyToCommentId(null)}>
                                Cancel reply
                              </button>
                            )}
                            <button className="share-submit-btn" type="button" onClick={handleAddComment}>
                              {replyToCommentId ? 'Reply' : 'Post'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#a1a1aa', fontSize: 13 }}>Create a file task</label>
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="modal-input"
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="e.g. Review by Friday"
                />
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="modal-textarea"
                  style={{ width: '100%', height: 70, marginTop: 8 }}
                  placeholder="Notes (optional)"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                  <input
                    value={taskDueAt}
                    onChange={(e) => setTaskDueAt(e.target.value)}
                    className="modal-input"
                    type="date"
                    style={{ width: '100%' }}
                  />
                  <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)} className="modal-input">
                    <option value={1}>High</option>
                    <option value={2}>Medium</option>
                    <option value={3}>Low</option>
                  </select>
                  <select value={taskAssigneeId || ''} onChange={(e) => setTaskAssigneeId(e.target.value)} className="modal-input">
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.user}>
                        {m.display_name || m.user?.email || m.user}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="share-submit-btn" onClick={handleCreateTask} disabled={creatingTask}>
                    {creatingTask ? 'Creating…' : 'Create task'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                {['todo', 'in_progress', 'done'].map((st) => (
                  <div key={st} className="ps-card" style={{ padding: 16 }}>
                    <div style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'capitalize' }}>{st.replace('_', ' ')}</div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                      {tasks.filter((t) => t.status === st).map((t) => (
                        <div key={t.id} style={{ border: '1px solid #27272a', borderRadius: 10, padding: 12, color: '#e4e4e7' }}>
                          <div style={{ fontWeight: 600, color: 'white' }}>{t.title}</div>
                          <div style={{ color: '#71717a', fontSize: 13, marginTop: 4 }}>
                            Due: {t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'} · Assignee: {t.assignee_name || '—'}
                          </div>
                        </div>
                      ))}
                      {tasks.filter((t) => t.status === st).length === 0 && (
                        <div style={{ color: '#71717a', fontSize: 13 }}>No tasks</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="ps-card" style={{ padding: 16 }}>
          <div style={{ color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Members</div>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {members.length === 0 ? (
              <div style={{ color: '#71717a', fontSize: 13 }}>No members found.</div>
            ) : (
              members.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ color: 'white', fontWeight: 600 }}>{m.display_name || m.user?.email}</div>
                  <div style={{ color: '#71717a', fontSize: 13 }}>{m.role}</div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #27272a' }}>
            <div style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 10 }}>Notification preferences</div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e4e4e7', fontSize: 13, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={muteInApp}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setMuteInApp(next);
                  setMuteLoading(true);
                  try {
                    await setMySpaceMuteApi(spaceId, { mute_in_app: next, mute_weekly_digest: muteWeeklyDigest });
                  } catch {
                    // rollback
                    setMuteInApp(!next);
                  } finally {
                    setMuteLoading(false);
                  }
                }}
                disabled={muteLoading}
              />
              Mute in-app notifications
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e4e4e7', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={muteWeeklyDigest}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setMuteWeeklyDigest(next);
                  setMuteLoading(true);
                  try {
                    await setMySpaceMuteApi(spaceId, { mute_in_app: muteInApp, mute_weekly_digest: next });
                  } catch {
                    setMuteWeeklyDigest(!next);
                  } finally {
                    setMuteLoading(false);
                  }
                }}
                disabled={muteLoading}
              />
              Mute weekly digest emails
            </label>
          </div>
        </aside>
      </div>
    </main>
  );
}

function ThreadCommentsTree({
  comments,
  replyToCommentId,
  setReplyToCommentId,
  commentDrafts,
  setCommentDrafts,
  activeThreadId,
}) {
  const childrenByParent = React.useMemo(() => {
    const map = {};
    (comments || []).forEach((c) => {
      const pid = c.parent === null || c.parent === undefined ? null : Number(c.parent);
      if (!map[pid]) map[pid] = [];
      map[pid].push(c);
    });
    // Sort stable by created_at (oldest -> newest)
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
    return map;
  }, [comments]);

  const renderBranch = (parentId, depth = 0) => {
    const key = parentId === null ? 'null' : String(parentId);
    const list = childrenByParent[parentId] || [];
    if (!list.length) return null;

    return list.map((c) => {
      const thisId = Number(c.id);
      return (
        <div key={c.id} style={{ marginTop: depth === 0 ? 12 : 10 }}>
          <div
            style={{
              borderLeft: depth > 0 ? '2px solid rgba(225, 29, 72, 0.35)' : 'none',
              paddingLeft: depth > 0 ? 12 : 0,
            }}
          >
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#a1a1aa', fontSize: 12 }}>
                  {c.author_name || 'Member'} · {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                </div>
                <div style={{ color: 'white', fontSize: 13, marginTop: 6, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                {c.highlight_text ? (
                  <div style={{ color: '#71717a', fontSize: 12, marginTop: 6 }}>
                    Highlight: {c.highlight_text}
                  </div>
                ) : null}
              </div>

              <div style={{ flexShrink: 0 }}>
                <button
                  className="p-btn"
                  type="button"
                  style={{ padding: '6px 10px' }}
                  onClick={() => {
                    setReplyToCommentId(thisId);
                    const draftKey = `${activeThreadId}:${thisId}`;
                    setCommentDrafts((prev) => ({ ...prev, [draftKey]: prev[draftKey] || '' }));
                  }}
                >
                  Reply
                </button>
              </div>
            </div>

            {replyToCommentId === thisId ? (
              <div style={{ color: '#fda4af', fontSize: 12, marginTop: 6 }}>Replying to this comment</div>
            ) : null}

            {renderBranch(thisId, depth + 1)}
          </div>
        </div>
      );
    });
  };

  return (
    <div>
      {renderBranch(null, 0)}
      {(!comments || comments.length === 0) && (
        <div style={{ color: '#71717a', fontSize: 13 }}>No comments yet.</div>
      )}
    </div>
  );
}


