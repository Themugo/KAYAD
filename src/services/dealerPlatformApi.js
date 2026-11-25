import { api } from '../api/httpClient';

export const getDealerDashboard = () => api.get('/dealer-platform/dashboard').then(r => r.data);
/** Role-aware command centre (read-only). The dealership is resolved on the server from the signed-in membership. */
export const getCommandCentre = (days) => api.get('/dealer-platform/command-centre', days ? { params: { days } } : undefined).then(r => r.data);
export const getLeads = (params = {}) => api.get('/dealer-platform/leads', { params }).then(r => r.data);
export const updateLead = (leadId, body) => api.put(`/dealer-platform/leads/${leadId}`, body).then(r => r.data);
export const getCustomers = () => api.get('/dealer-platform/customers').then(r => r.data);
export const getMarketingCampaigns = () => api.get('/dealer-platform/marketing').then(r => r.data);
export const createCampaign = (body) => api.post('/dealer-platform/marketing', body).then(r => r.data);
export const getAuctionInventory = () => api.get('/dealer-platform/auctions').then(r => r.data);
export const getFinanceApplications = () => api.get('/dealer-platform/finance').then(r => r.data);
export const getInspectionOrders = () => api.get('/dealer-platform/inspections').then(r => r.data);
export const getTeamMembers = () => api.get('/dealer-platform/team').then(r => ({ members: r.data?.data?.items || [], stats: r.data?.data?.stats || {}, employmentAvailable: r.data?.employmentAvailable !== false, success: r.data?.success !== false }));
export const getDealerAnalytics = () => api.get('/dealer-platform/analytics').then(r => r.data);


export const getDealerProfile = (dealerId) => api.get(`/dealer-platform/profile/${dealerId}`).then(r => r.data);
export const getVerificationStatus = () => api.get('/verification/status').then(r => r.data);
export const updateDealerProfile = (dealerId, body) => api.put(`/dealer-platform/profile/${dealerId}`, body).then(r => r.data);
export const getReputation = () => api.get("/dealer-platform/reputation").then(r => r.data);
export const updateCampaign = (campaignId, body) => api.put(`/dealer-platform/marketing/${campaignId}`, body).then(r => r.data);
export const getLeadActivities = (leadId) => api.get(`/dealer-platform/leads/${leadId}/activities`).then(r => r.data);
export const addLeadNote = (leadId, note) => api.post(`/dealer-platform/leads/${leadId}/notes`, { note }).then(r => r.data);
export const getLeadMessages = (leadId) => api.get(`/dealer-platform/leads/${leadId}/messages`).then(r => r.data);
export const sendLeadMessage = (leadId, content, idempotencyKey) => api.post(`/dealer-platform/leads/${leadId}/messages`, { content }, { headers: { 'Idempotency-Key': idempotencyKey } }).then(r => r.data);
export const getVehicleRequests = () => api.get('/dealer-platform/vehicle-requests').then(r => r.data);
export const createVehicleRequest = (body) => api.post('/dealer-platform/vehicle-requests', body).then(r => r.data);
export const createLeadTask = (leadId, body) => api.post(`/dealer-platform/leads/${leadId}/tasks`, body).then(r => r.data);
export const inviteTeamMember = (body) => api.post('/dealer-platform/team/invite', body).then(r => r.data);
export const updateTeamMember = (memberId, body) => api.put(`/dealer-platform/team/${memberId}`, body).then(r => r.data);
export const removeTeamMember = (memberId) => api.delete(`/dealer-platform/team/${memberId}`).then(r => r.data);
export const resendTeamInvite = (memberId) => api.post(`/dealer-platform/team/${memberId}/resend`).then(r => r.data);
export const getTeamRoles = () => api.get('/dealer-platform/team/roles').then(r => r.data);
export const createTeamRole = (body) => api.post('/dealer-platform/team/roles', body).then(r => r.data);
export const updateTeamRole = (key, body) => api.put(`/dealer-platform/team/roles/${encodeURIComponent(key)}`, body).then(r => r.data);
export const deleteTeamRole = (key) => api.delete(`/dealer-platform/team/roles/${encodeURIComponent(key)}`).then(r => r.data);
// Public, read-only: what is this invitation link? (POST so the token never appears in a URL or access log.)
export const previewTeamInvitation = (token) => api.post('/dealer-platform/team/invitation/preview', { token }).then(r => r.data);
export const acceptTeamInvite = (token) => api.post('/dealer-platform/team/accept', { token }).then(r => r.data);
export const getMyWorkspace = () => api.get('/dealer-platform/my-workspace').then(r => r.data?.data || { membership: null, ambiguous: false });
/** Bulk actions: the server checks every record against the dealership and the caller's permissions and itemises the outcome. */
export const bulkInventoryStatus = (ids, status) => api.post('/dealer-platform/inventory/bulk', { ids, action: 'status', data: { status } }).then(r => r.data?.data || {});
export const bulkInventoryDelete = (ids) => api.post('/dealer-platform/inventory/bulk-delete', { ids }).then(r => r.data?.data || {});
export const getInventory = (params = {}) => api.get('/dealer-platform/inventory', { params }).then(r => r.data?.data || { items: [] });

// ---- Employment (Team & Employment). Server-enforced; the browser never decides who may do what. ----
export const getTeamMemberDetail = (memberId) => api.get(`/dealer-platform/team/${memberId}`).then(r => r.data);
export const getTemporaryDuties = (memberId) => api.get(`/dealer-platform/team/${memberId}/temporary-duties`).then(r => r.data);
export const createTemporaryDuty = (memberId, body) => api.post(`/dealer-platform/team/${memberId}/temporary-duties`, body).then(r => r.data);
export const revokeTemporaryDuty = (memberId, grantId) => api.delete(`/dealer-platform/team/${memberId}/temporary-duties/${grantId}`).then(r => r.data);
export const applyEmploymentAction = (memberId, body) => api.post(`/dealer-platform/team/${memberId}/employment`, body).then(r => r.data);
export const setMemberBusinessEmail = (memberId, businessEmail) => api.put(`/dealer-platform/team/${memberId}/business-email`, { businessEmail }).then(r => r.data);
export const getEmploymentRecords = () => api.get('/dealer-platform/team/employment-events').then(r => r.data);
export const getStaffCode = () => api.get('/dealer-platform/team/staff-code').then(r => r.data);
export const putStaffCode = (staffCode) => api.put('/dealer-platform/team/staff-code', { staffCode }).then(r => r.data);
export const getMyStaffProfile = () => api.get('/dealer-platform/team/me').then(r => r.data);
export const updateMyStaffProfile = (body) => api.put('/dealer-platform/team/me', body).then(r => r.data);
