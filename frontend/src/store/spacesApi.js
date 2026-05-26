import api from '../api/axiosInstance'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})

export const fetchSpacesApi = () =>
  api.get('/spaces/', { headers: authHeaders() })

export const createSpaceApi = (payload) =>
  api.post('/spaces/', payload, { headers: authHeaders() })

export const fetchSpaceMembersApi = (spaceId) =>
  api.get(`/spaces/${spaceId}/members/`, { headers: authHeaders() })

export const fetchSpaceFilesApi = (spaceId) =>
  api.get(`/spaces/${spaceId}/files/`, { headers: authHeaders() })

export const uploadSpaceFilesApi = (spaceId, files, options = {}) => {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  if (options.change_note) formData.append('change_note', options.change_note)
  return api.post(`/spaces/${spaceId}/files/upload/`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  })
}

export const fetchSpaceVersionsApi = (spaceId, spaceFileId) =>
  api.get(`/spaces/${spaceId}/files/${spaceFileId}/versions/`, { headers: authHeaders() })

export const restoreSpaceFileVersionApi = (spaceId, spaceFileId, versionId) =>
  api.post(
    `/spaces/${spaceId}/files/${spaceFileId}/restore/`,
    { version_id: versionId },
    { headers: authHeaders() }
  )

export const pinSpaceFileApi = (spaceId, spaceFileId) =>
  api.post(`/spaces/${spaceId}/files/${spaceFileId}/pin/`, {}, { headers: authHeaders() })

export const pinSpaceFileVersionApi = (spaceId, spaceFileId, versionId) =>
  api.post(
    `/spaces/${spaceId}/files/${spaceFileId}/pin-version/`,
    { version_id: versionId },
    { headers: authHeaders() }
  )

export const fetchSpaceThreadsApi = (spaceId, spaceFileId) =>
  api.get(`/spaces/${spaceId}/files/${spaceFileId}/threads/`, { headers: authHeaders() })

export const createSpaceThreadApi = (spaceId, spaceFileId, payload) =>
  api.post(`/spaces/${spaceId}/files/${spaceFileId}/threads/`, payload, { headers: authHeaders() })

export const resolveSpaceThreadApi = (spaceId, threadId, isResolved) =>
  api.post(
    `/spaces/${spaceId}/threads/${threadId}/resolve/`,
    { is_resolved: isResolved },
    { headers: authHeaders() }
  )

export const addSpaceThreadCommentApi = (spaceId, threadId, payload) =>
  api.post(`/spaces/${spaceId}/threads/${threadId}/comments/`, payload, { headers: authHeaders() })

export const fetchSpaceThreadCommentsApi = (spaceId, threadId) =>
  api.get(`/spaces/${spaceId}/threads/${threadId}/comments/`, { headers: authHeaders() })

export const fetchSpaceTasksApi = (spaceId, { status } = {}) =>
  api.get(`/spaces/${spaceId}/tasks/`, {
    headers: authHeaders(),
    params: { ...(status ? { status } : {}) },
  })

export const createSpaceTaskApi = (spaceId, spaceFileId, payload) =>
  api.post(`/spaces/${spaceId}/files/${spaceFileId}/tasks/`, payload, { headers: authHeaders() })

export const fetchUnresolvedThreadsApi = () =>
  api.get('/spaces/unresolved-threads/', { headers: authHeaders() })

export const fetchSpaceNotificationsApi = () =>
  api.get('/spaces/notifications/', { headers: authHeaders() })

export const markAllSpaceNotificationsReadApi = () =>
  api.post('/spaces/notifications/', {}, { headers: authHeaders() })

export const presenceHeartbeatApi = (spaceId) =>
  api.post(`/spaces/${spaceId}/presence/heartbeat/`, {}, { headers: authHeaders() })

export const fetchMySpaceMuteApi = (spaceId) =>
  api.get(`/spaces/${spaceId}/my/mute/`, { headers: authHeaders() })

export const setMySpaceMuteApi = (spaceId, payload) =>
  api.post(`/spaces/${spaceId}/my/mute/`, payload, { headers: authHeaders() })

