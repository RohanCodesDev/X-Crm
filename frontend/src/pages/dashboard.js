import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import ThemeToggle from '../components/toggle';
import { getApiBaseUrl } from '../lib/api-base';

export default function DashboardPage() {
  const apiBase = getApiBaseUrl();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [authToken, setAuthToken] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    connectedForms: 0,
    totalRespondents: 0,
    syncRuns: 0,
    campaigns: 0
  });
  const [forms, setForms] = useState([]);
  const [allRespondents, setAllRespondents] = useState([]);
  const [respondentsLoaded, setRespondentsLoaded] = useState(false);
  const [respondents, setRespondents] = useState([]);
  const [respondentPage, setRespondentPage] = useState(0);
  const [respondentHasMore, setRespondentHasMore] = useState(true);
  const [loadingMoreRespondents, setLoadingMoreRespondents] = useState(false);
  const [respondentSearch, setRespondentSearch] = useState('');
  const [respondentSortOrder, setRespondentSortOrder] = useState('none');
  const [respondentFilterOpen, setRespondentFilterOpen] = useState(false);
  const [selectedFormFilter, setSelectedFormFilter] = useState('');
  const [selectedCampaignFormFilter, setSelectedCampaignFormFilter] = useState('');
  const [respondentFieldDropdownOpen, setRespondentFieldDropdownOpen] = useState(false);
  const [selectedRespondentFields, setSelectedRespondentFields] = useState([]);
  const [availableRespondentFields, setAvailableRespondentFields] = useState([]);
  const [uiError, setUiError] = useState('');
  const [uiMessage, setUiMessage] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [formPayload, setFormPayload] = useState({
    name: '',
    sheetId: '',
    sheetName: 'Form Responses 1'
  });
  const [savingForm, setSavingForm] = useState(false);
  const [syncingId, setSyncingId] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [selectedRespondent, setSelectedRespondent] = useState(null);
  const [respondentDrawerOpen, setRespondentDrawerOpen] = useState(false);
  const [respondentDetailLoading, setRespondentDetailLoading] = useState(false);
  const [campaignSummary, setCampaignSummary] = useState({
    totalRespondents: 0,
    emailableRespondents: 0,
    forms: []
  });
  const [campaignPreview, setCampaignPreview] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [manualBlastOpen, setManualBlastOpen] = useState(false);
  const [manualBlastSending, setManualBlastSending] = useState(false);
  const [manualBlastRecipientInput, setManualBlastRecipientInput] = useState('');
  const [manualBlastPayload, setManualBlastPayload] = useState({
    subject: '',
    cc: '',
    body: ''
  });
  const [manualBlastRecipients, setManualBlastRecipients] = useState([]);

  const tabCopy = {
    overview: {
      title: 'Dashboard',
      subtitle: ''
    },
    forms: {
      title: 'Connected Forms',
      subtitle: ''
    },
    respondents: {
      title: 'Respondent Directory',
      subtitle: ''
    },
    campaigns: {
      title: 'Campaign Workspace',
      subtitle: ''
    },
    settings: {
      title: 'Settings',
      subtitle: ''
    }
  };

  async function requestGoogleSheetsAccessToken() {
    if (!googleClientId) {
      throw new Error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID for Google Sheets access.');
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google OAuth script is not ready yet. Please try again.');
    }

    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        callback: (response) => {
          if (response?.access_token) {
            resolve(response.access_token);
            return;
          }

          reject(new Error('Could not retrieve Google Sheets access token.'));
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  function getDemoRespondents() {
    return [
      {
        id: 'demo-resp-1',
        name: 'Avery Stone',
        email: 'avery@example.com',
        sourceRowNumber: 2,
        formConnection: { id: 'demo-form-1', name: 'Website Lead Form', sheetName: 'Form Responses 1' },
        rawData: {
          Name: 'Avery Stone',
          Email: 'avery@example.com',
          Company: 'Northline Ventures',
          Intent: 'High'
        }
      },
      {
        id: 'demo-resp-2',
        name: 'Mila Cortez',
        email: 'mila@example.com',
        sourceRowNumber: 3,
        formConnection: { id: 'demo-form-2', name: 'Webinar Registration', sheetName: 'Responses' },
        rawData: {
          Name: 'Mila Cortez',
          Email: 'mila@example.com',
          Company: 'Aster Labs',
          Intent: 'Medium'
        }
      },
      {
        id: 'demo-resp-3',
        name: 'Noah Reed',
        email: 'noah@example.com',
        sourceRowNumber: 4,
        formConnection: { id: 'demo-form-1', name: 'Website Lead Form', sheetName: 'Form Responses 1' },
        rawData: {
          Name: 'Noah Reed',
          Email: 'noah@example.com',
          Company: 'Bridgepoint Digital',
          Intent: 'High'
        }
      }
    ];
  }

  function loadDemoData() {
    setStats({
      connectedForms: 2,
      totalRespondents: 48,
      syncRuns: 6,
      campaigns: 1
    });

    setForms([
      {
        id: 'demo-form-1',
        name: 'Website Lead Form',
        sheetName: 'Form Responses 1',
        status: 'active',
        lastSyncedAt: new Date().toISOString(),
        _count: { respondents: 31 }
      },
      {
        id: 'demo-form-2',
        name: 'Webinar Registration',
        sheetName: 'Responses',
        status: 'active',
        lastSyncedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        _count: { respondents: 17 }
      }
    ]);

    setRespondents(getDemoRespondents());
    setAllRespondents(getDemoRespondents());
    setRespondentsLoaded(true);
    setAvailableRespondentFields(getDemoRespondentFields(selectedFormFilter));
    setSelectedRespondentFields([]);
    setRespondentFieldDropdownOpen(false);

    setCampaignSummary({
      totalRespondents: 48,
      emailableRespondents: 48,
      forms: [
        { id: 'demo-form-1', name: 'Website Lead Form', respondents: 31 },
        { id: 'demo-form-2', name: 'Webinar Registration', respondents: 17 }
      ]
    });
  }

  const recentActivity = useMemo(() => {
    if (forms.length === 0) {
      return [{ id: 'empty', type: 'info', message: 'No activity yet. Connect your first form to begin.' }];
    }

    return forms.slice(0, 3).map((form) => ({
      id: form.id,
      type: 'form_created',
      message: `${form.name} is connected (${form._count?.respondents || 0} respondents)`
    }));
  }, [forms]);

  const respondentDetailEntries = useMemo(() => {
    const payload = selectedRespondent?.rawData;
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    return Object.entries(payload).filter(([key]) => Boolean(key) && !selectedRespondentFields.includes(key) && !isCoreRespondentField(key));
  }, [selectedRespondent, selectedRespondentFields]);

  const selectedRespondentFieldColumns = useMemo(
    () => availableRespondentFields.filter((fieldName) => selectedRespondentFields.includes(fieldName)),
    [availableRespondentFields, selectedRespondentFields]
  );

  const sortedRespondents = useMemo(() => {
    const list = [...respondents];

    if (respondentSortOrder === 'none') {
      return list;
    }

    const getSortValue = (item) => {
      const primary = String(item?.name || '').trim();
      if (primary) {
        return primary.toLowerCase();
      }

      return String(item?.email || '').trim().toLowerCase();
    };

    list.sort((a, b) => {
      const first = getSortValue(a);
      const second = getSortValue(b);

      if (respondentSortOrder === 'asc') {
        return first.localeCompare(second);
      }

      return second.localeCompare(first);
    });

    return list;
  }, [respondents, respondentSortOrder]);

  function isLikelyUrl(value) {
    if (!value) {
      return false;
    }

    const text = String(value).trim();
    return /^(https?:\/\/|www\.)/i.test(text);
  }

  function isLikelyEmail(value) {
    if (!value) {
      return false;
    }

    const text = String(value).trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }

  function normalizeHref(value) {
    const text = String(value || '').trim();

    if (isLikelyEmail(text)) {
      return `mailto:${text}`;
    }

    if (/^https?:\/\//i.test(text)) {
      return text;
    }

    if (/^www\./i.test(text)) {
      return `https://${text}`;
    }

    return text;
  }

  function renderRespondentFieldValue(value) {
    const plain = String(value || '-');

    if (isLikelyUrl(plain) || isLikelyEmail(plain)) {
      const href = normalizeHref(plain);
      return (
        <a href={href} target="_blank" rel="noreferrer" className="drawer-value-link">
          {plain}
        </a>
      );
    }

    return plain;
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function isCoreRespondentField(fieldName) {
    const normalized = normalizeSearchText(fieldName);
    return normalized === 'name' || normalized === 'email';
  }

  function getDemoRespondentFields(formId = '') {
    const fieldNames = new Set();

    getDemoRespondents().forEach((respondent) => {
      if (formId && respondent?.formConnection?.id !== formId) {
        return;
      }

      Object.keys(respondent?.rawData || {}).forEach((fieldName) => {
        if (fieldName && !isCoreRespondentField(fieldName)) {
          fieldNames.add(fieldName);
        }
      });
    });

    return Array.from(fieldNames).sort((first, second) => first.localeCompare(second));
  }

  function tokenizeSearchQuery(value) {
    return normalizeSearchText(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8);
  }

  function buildAuthHeaders(extraHeaders = {}) {
    if (!authToken) {
      return extraHeaders;
    }

    return {
      ...extraHeaders,
      Authorization: `Bearer ${authToken}`
    };
  }

  function handleUnauthorized(response, data) {
    if (response.status === 401) {
      localStorage.removeItem('xcrmGoogleIdToken');
      window.location.href = '/login';
      throw new Error(data?.message || 'Session expired. Please sign in again.');
    }
  }

  async function fetchStats() {
    const response = await fetch(`${apiBase}/crm/stats`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();
    handleUnauthorized(response, data);
    if (!response.ok) throw new Error(data.message || 'Could not fetch stats');
    setStats(data);
  }

  async function fetchForms() {
    const response = await fetch(`${apiBase}/crm/forms`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();
    handleUnauthorized(response, data);
    if (!response.ok) throw new Error(data.message || 'Could not fetch forms');
    setForms(data.forms || []);
  }

  async function fetchRespondents({ reset = true, offset = 0, limit = 100 } = {}) {
    const params = new URLSearchParams();

    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const response = await fetch(`${apiBase}/crm/respondents?${params.toString()}`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();
    handleUnauthorized(response, data);
    if (!response.ok) throw new Error(data.message || 'Could not fetch respondents');

    const nextRespondents = data.respondents || [];
    const totalCount = Number(data.totalCount || nextRespondents.length || 0);

    setAllRespondents((current) => (reset ? nextRespondents : [...current, ...nextRespondents]));
    setRespondents((current) => (reset ? nextRespondents : [...current, ...nextRespondents]));
    setRespondentsLoaded(true);
    setRespondentPage(offset / limit);
    setRespondentHasMore(offset + nextRespondents.length < totalCount);
    return { respondents: nextRespondents, totalCount };
  }

  async function fetchRespondentFields(formId = selectedFormFilter) {
    if (demoMode) {
      const demoFields = getDemoRespondentFields(formId);
      setAvailableRespondentFields(demoFields);
      setSelectedRespondentFields((current) => current.filter((fieldName) => demoFields.includes(fieldName)));
      return demoFields;
    }

    const params = new URLSearchParams();
    if (formId) {
      params.set('formId', formId);
    }

    const queryString = params.toString();
    const response = await fetch(`${apiBase}/crm/respondents/fields${queryString ? `?${queryString}` : ''}`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();
    handleUnauthorized(response, data);
    if (!response.ok) throw new Error(data.message || 'Could not fetch respondent fields');

    const nextFields = Array.isArray(data.fields)
      ? data.fields.filter((fieldName) => fieldName && !isCoreRespondentField(fieldName))
      : [];

    setAvailableRespondentFields(nextFields);
    setSelectedRespondentFields((current) => current.filter((fieldName) => nextFields.includes(fieldName)));
    return nextFields;
  }

  function filterRespondents(source, searchValue = '') {
    const tokens = tokenizeSearchQuery(searchValue);

    if (tokens.length === 0) {
      return source;
    }

    return source.filter((item) => {
      const rawDataValues = Object.values(item?.rawData || {}).map((entry) => String(entry || ''));
      const searchable = normalizeSearchText(
        [
          item?.name,
          item?.email,
          item?.formConnection?.name,
          item?.formConnection?.sheetName,
          item?.sourceRowNumber,
          ...rawDataValues
        ].join(' ')
      );

      return tokens.every((token) => searchable.includes(token));
    });
  }

  async function runRespondentSearch(searchValue = '') {
    const normalized = String(searchValue || '').trim();

    if (demoMode) {
      const source = getDemoRespondents();
      setRespondents(filterRespondents(source, normalized));
      return;
    }

    setRespondents(filterRespondents(allRespondents, normalized));
  }

  async function fetchCampaignSummary() {
    const response = await fetch(`${apiBase}/crm/campaigns/summary`, {
      headers: buildAuthHeaders()
    });
    const data = await response.json();
    handleUnauthorized(response, data);
    if (!response.ok) throw new Error(data.message || 'Could not fetch campaign summary');
    setCampaignSummary({
      totalRespondents: Number(data.totalRespondents || 0),
      emailableRespondents: Number(data.emailableRespondents || 0),
      forms: Array.isArray(data.forms) ? data.forms : []
    });
  }

  async function bootstrap() {
    setUiError('');
    await Promise.all([fetchStats(), fetchForms(), fetchRespondents({ reset: true, offset: 0, limit: 100 })]);
  }

  useEffect(() => {
    const isDemoMode = localStorage.getItem('xcrmDemoMode') === 'true';

    if (isDemoMode) {
      setDemoMode(true);
      setUiMessage('You are viewing Demo Mode. Sign in with Google to use live data.');
      loadDemoData();
      return;
    }

    const storedToken = localStorage.getItem('xcrmGoogleIdToken') || '';
    if (!storedToken) {
      window.location.href = '/login';
      return;
    }

    setDemoMode(false);
    setAuthToken(storedToken);
  }, []);

  useEffect(() => {
    if (!authToken || demoMode) {
      return;
    }

    bootstrap().catch((error) => {
      setUiError(error.message || 'Failed to load CRM data');
    });
  }, [authToken, demoMode]);

  useEffect(() => {
    if (activeTab !== 'respondents') {
      return;
    }

    if (!demoMode && !authToken) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      setUiError('');
      runRespondentSearch(respondentSearch).catch((error) => {
        setUiError(error.message || 'Failed to search respondents');
      });
    }, 80);

    return () => clearTimeout(debounceTimer);
  }, [activeTab, demoMode, authToken, respondentSearch, allRespondents]);

  useEffect(() => {
    if (activeTab !== 'respondents') {
      return;
    }

    if (!demoMode && !authToken) {
      return;
    }

    fetchRespondentFields(selectedFormFilter).catch((error) => {
      setUiError(error.message || 'Could not load respondent fields');
    });
  }, [activeTab, demoMode, authToken, selectedFormFilter]);

  useEffect(() => {
    if (activeTab !== 'respondents' || demoMode || !authToken || respondentsLoaded) {
      return;
    }

      fetchRespondents({ reset: true, offset: 0, limit: 100 }).catch((error) => {
      setUiError(error.message || 'Could not load respondents');
    });
  }, [activeTab, demoMode, authToken, respondentsLoaded]);

  useEffect(() => {
    if (activeTab !== 'campaigns') {
      return;
    }

    if (demoMode) {
      loadDemoData();
      return;
    }

    fetchCampaignSummary().catch((error) => {
      setUiError(error.message || 'Could not load campaign summary');
    });
  }, [activeTab, demoMode]);

  function parseSheetId(raw) {
    const trimmed = (raw || '').trim();
    const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      return match[1];
    }
    return trimmed;
  }

  async function handleCreateForm(event) {
    event.preventDefault();
    setUiError('');
    setUiMessage('');

    if (demoMode) {
      setUiMessage('Demo Mode: form connection is disabled. Sign in with Google to connect live forms.');
      return;
    }

    const sheetId = parseSheetId(formPayload.sheetId);
    if (!formPayload.name || !sheetId) {
      setUiError('Form name and Sheet ID/URL are required');
      return;
    }

    try {
      setSavingForm(true);
      const response = await fetch(`${apiBase}/crm/forms`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          name: formPayload.name.trim(),
          sheetId,
          sheetName: formPayload.sheetName.trim() || 'Form Responses 1'
        })
      });

      const data = await response.json();
      handleUnauthorized(response, data);
      if (!response.ok) throw new Error(data.message || 'Could not create form connection');

      setShowConnectModal(false);
      setFormPayload({ name: '', sheetId: '', sheetName: 'Form Responses 1' });
      setForms((current) => {
        const nextForm = data.form ? [data.form, ...current.filter((form) => form.id !== data.form.id)] : current;
        return nextForm;
      });

      setUiMessage('Form connected. Starting initial sync now.');
      await handleSyncForm(data.form.id);

      setActiveTab('respondents');
      setSelectedFormFilter(data.form.id);
      setRespondentFieldDropdownOpen(false);

      const { respondents: nextRespondents } = await fetchRespondents({ reset: true, offset: 0, limit: 100 });
      await fetchRespondentFields(data.form.id);

      setRespondents(filterRespondents(nextRespondents, respondentSearch));
    } catch (error) {
      setUiError(error.message || 'Could not connect form');
    } finally {
      setSavingForm(false);
    }
  }

  async function handleSyncForm(formId) {
    if (demoMode) {
      setUiMessage('Demo Mode: sync is disabled. Sign in with Google to run live sync.');
      return;
    }

    try {
      setSyncingId(formId);
      setUiError('');
      setUiMessage('');

      let googleAccessToken;
      if (googleScriptReady) {
        googleAccessToken = await requestGoogleSheetsAccessToken();
      }

      const response = await fetch(`${apiBase}/crm/forms/${formId}/sync`, {
        method: 'POST',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          googleAccessToken
        })
      });
      const data = await response.json();
      handleUnauthorized(response, data);

      if (!response.ok) throw new Error(data.message || 'Sync failed');

      setUiMessage(`Sync complete. Imported ${data.importedCount || 0} rows.`);
      await Promise.all([fetchForms(), fetchStats()]);

      if (activeTab === 'respondents') {
        await fetchRespondents({ reset: true, offset: 0, limit: 100 });
        await fetchRespondentFields(selectedFormFilter);
        await runRespondentSearch(respondentSearch);
      }
    } catch (error) {
      setUiError(error.message || 'Sync failed');
    } finally {
      setSyncingId('');
    }
  }

  async function handleSyncAllForms() {
    if (demoMode) {
      setUiMessage('Demo Mode: bulk sync is disabled. Sign in with Google to run live sync.');
      return;
    }

    if (forms.length === 0) {
      setUiMessage('No connected forms found. Connect a form first.');
      return;
    }

    try {
      setSyncingAll(true);
      setUiError('');
      setUiMessage('');

      let googleAccessToken;
      if (googleScriptReady) {
        googleAccessToken = await requestGoogleSheetsAccessToken();
      }

      const syncResults = await Promise.allSettled(
        forms.map(async (form) => {
          const response = await fetch(`${apiBase}/crm/forms/${form.id}/sync`, {
          method: 'POST',
          headers: buildAuthHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            googleAccessToken
          })
          });

          const data = await response.json();
          handleUnauthorized(response, data);
          if (!response.ok) {
            throw new Error(data.message || `Sync failed for ${form.name}`);
          }

          return Number(data.importedCount || 0);
        })
      );

      const importedCount = syncResults
        .filter((result) => result.status === 'fulfilled')
        .reduce((total, result) => total + Number(result.value || 0), 0);
      const failedResult = syncResults.find((result) => result.status === 'rejected');

      if (failedResult) {
        throw failedResult.reason;
      }

      setUiMessage(`Bulk sync complete. Imported ${importedCount} rows across ${forms.length} forms.`);
      await Promise.all([fetchForms(), fetchStats()]);

      if (activeTab === 'respondents') {
        await fetchRespondents({ reset: true, offset: 0, limit: 100 });
        await fetchRespondentFields(selectedFormFilter);
        await runRespondentSearch(respondentSearch);
      }
    } catch (error) {
      setUiError(error.message || 'Bulk sync failed');
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleRefreshData() {
    setUiError('');
    setUiMessage('');

    if (demoMode) {
      loadDemoData();
      setUiMessage('Demo data refreshed.');
      return;
    }

    try {
      await Promise.all([fetchStats(), fetchForms()]);

      if (activeTab === 'respondents') {
        await fetchRespondents({ reset: true, offset: 0, limit: 100 });
        await fetchRespondentFields(selectedFormFilter);
        await runRespondentSearch(respondentSearch);
      }

      setUiMessage('Dashboard data refreshed from server successfully.');
    } catch (error) {
      setUiError(error.message || 'Could not refresh dashboard data');
    }
  }

  async function handleLoadMoreRespondents() {
    if (loadingMoreRespondents || demoMode) return;
    try {
      setLoadingMoreRespondents(true);
      setUiError('');
      const limit = 100;
      const offset = (respondentPage + 1) * limit;
      await fetchRespondents({ reset: false, offset, limit });
    } catch (error) {
      setUiError(error.message || 'Could not load more respondents');
    } finally {
      setLoadingMoreRespondents(false);
    }
  }

  function handleSignOut() {
    localStorage.removeItem('xcrmGoogleIdToken');
    localStorage.removeItem('xcrmDemoMode');
    window.location.href = '/login';
  }

  async function handleRespondentSearch(event) {
    event.preventDefault();

    try {
      setUiError('');
      await runRespondentSearch(respondentSearch);
    } catch (error) {
      setUiError(error.message || 'Could not search respondents');
    }
  }

  async function handleOpenRespondent(row) {
    if (!row?.id) {
      return;
    }

    setRespondentDrawerOpen(true);
    setRespondentDetailLoading(true);
    setUiError('');

    if (demoMode) {
      setSelectedRespondent(row);
      setRespondentDetailLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiBase}/crm/respondents/${row.id}`, {
        headers: buildAuthHeaders()
      });
      const data = await response.json();
      handleUnauthorized(response, data);
      if (!response.ok) throw new Error(data.message || 'Could not fetch respondent details');
      setSelectedRespondent(data.respondent || null);
    } catch (error) {
      setUiError(error.message || 'Could not fetch respondent details');
      setSelectedRespondent(row);
    } finally {
      setRespondentDetailLoading(false);
    }
  }

  async function handleDeleteForm(form) {
    if (!form?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${form.name}? This will remove the form, its respondents, permissions, and sync history.`
    );

    if (!confirmed) {
      return;
    }

    setUiError('');
    setUiMessage('');

    if (demoMode) {
      setForms((current) => current.filter((item) => item.id !== form.id));
      setAllRespondents((current) => current.filter((item) => item.formConnectionId !== form.id));
      setRespondents((current) => current.filter((item) => item.formConnectionId !== form.id));
      if (selectedFormFilter === form.id) {
        setSelectedFormFilter('');
        setSelectedRespondentFields([]);
      }
      setRespondentSearch('');
      setStats((current) => ({
        ...current,
        connectedForms: Math.max(0, current.connectedForms - 1),
        totalRespondents: Math.max(
          0,
          current.totalRespondents - Number(form._count?.respondents || 0)
        ),
        syncRuns: current.syncRuns,
        campaigns: current.campaigns
      }));
      setUiMessage(`Demo form "${form.name}" deleted.`);
      return;
    }

    try {
      setUiMessage(`Deleting ${form.name}...`);
      const response = await fetch(`${apiBase}/crm/forms/${form.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      });

      const data = await response.json();
      handleUnauthorized(response, data);

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete form');
      }

      if (selectedRespondent?.formConnection?.id === form.id) {
        setRespondentDrawerOpen(false);
        setSelectedRespondent(null);
      }

      if (selectedFormFilter === form.id) {
        setSelectedFormFilter('');
        setSelectedRespondentFields([]);
      }

      setForms((current) => current.filter((item) => item.id !== form.id));
      setAllRespondents((current) => current.filter((item) => item.formConnectionId !== form.id));
      setRespondents((current) => current.filter((item) => item.formConnectionId !== form.id));
      setRespondentSearch('');
      setStats((current) => ({
        ...current,
        connectedForms: Math.max(0, current.connectedForms - 1),
        totalRespondents: Math.max(0, current.totalRespondents - Number(data.deletedRespondents || form._count?.respondents || 0)),
        syncRuns: Math.max(0, current.syncRuns - Number(data.deletedSyncRuns || 0))
      }));

      setCampaignSummary((current) => ({
        ...current,
        totalRespondents: Math.max(0, current.totalRespondents - Number(data.deletedRespondents || form._count?.respondents || 0)),
        forms: current.forms.filter((item) => item.id !== form.id)
      }));

      setUiMessage(data.message || `Deleted ${form.name}.`);
    } catch (error) {
      setUiError(error.message || 'Could not delete form');
    }
  }

  async function handlePrepareCampaign(campaignType) {
    setUiError('');
    setUiMessage('');

    if (demoMode) {
      const sample = respondents.slice(0, 10).map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        formConnection: item.formConnection
      }));

      setCampaignPreview({
        campaignType,
        recipientsCount: sample.length,
        sampleRecipients: sample,
        suggestedSubject:
          campaignType === 'sequence'
            ? 'Your next step after submitting the form'
            : 'Quick update from our team',
        suggestedCta:
          campaignType === 'sequence'
            ? 'Schedule your qualification call'
            : 'Reply to this email to connect'
      });
      setCampaignModalOpen(true);
      return;
    }

    try {
      setCampaignLoading(true);
      const response = await fetch(`${apiBase}/crm/campaigns/preview`, {
        method: 'POST',
        headers: buildAuthHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          campaignType,
          q: respondentSearch || undefined,
          limit: 20
        })
      });

      const data = await response.json();
      handleUnauthorized(response, data);
      if (!response.ok) throw new Error(data.message || 'Could not prepare campaign preview');

      setCampaignPreview(data);
      setCampaignModalOpen(true);
    } catch (error) {
      setUiError(error.message || 'Could not prepare campaign');
    } finally {
      setCampaignLoading(false);
    }
  }

  function handleLaunchCampaign() {
    setCampaignModalOpen(false);
    setUiMessage('Campaign draft prepared. Integrate your email provider to send this to recipients.');
  }

  function extractEmailsFromInput(rawInput) {
    const matches = String(rawInput || '').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
    if (!matches) {
      return [];
    }

    const unique = new Set(matches.map((entry) => entry.trim().toLowerCase()).filter(Boolean));
    return Array.from(unique);
  }

  function handleAddManualRecipients() {
    const parsedEmails = extractEmailsFromInput(manualBlastRecipientInput);

    if (parsedEmails.length === 0) {
      setUiError('Add at least one valid recipient email.');
      return;
    }

    setUiError('');
    setManualBlastRecipients((current) => {
      const existing = new Set(current.map((item) => item.email.toLowerCase()));
      const toAdd = parsedEmails
        .filter((email) => !existing.has(email))
        .map((email, index) => ({
          id: `${Date.now()}-${index}-${email}`,
          email,
          count: 1,
          sentCount: 0,
          lastStatus: 'idle',
          lastError: ''
        }));

      return [...current, ...toAdd];
    });
    setManualBlastRecipientInput('');
  }

  function handleRemoveManualRecipient(recipientId) {
    setManualBlastRecipients((current) => current.filter((item) => item.id !== recipientId));
  }

  function handleManualRecipientCountChange(recipientId, delta) {
    setManualBlastRecipients((current) =>
      current.map((item) => {
        if (item.id !== recipientId) {
          return item;
        }

        const nextCount = Math.max(1, Math.min(20, Number(item.count || 1) + Number(delta || 0)));
        return {
          ...item,
          count: nextCount
        };
      })
    );
  }

  function escapeHtmlForEmail(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function handleSendManualBlast(event) {
    event.preventDefault();
    setUiError('');
    setUiMessage('');

    if (!manualBlastRecipients.length) {
      setUiError('Add at least one recipient before sending.');
      return;
    }

    if (!manualBlastPayload.subject.trim()) {
      setUiError('Subject is required.');
      return;
    }

    if (!manualBlastPayload.body.trim()) {
      setUiError('Email body is required.');
      return;
    }

    if (demoMode) {
      const updated = manualBlastRecipients.map((recipient) => ({
        ...recipient,
        sentCount: Number(recipient.count || 1),
        lastStatus: 'sent',
        lastError: ''
      }));
      setManualBlastRecipients(updated);
      setUiMessage(
        `Demo Mode: prepared ${updated.reduce((sum, item) => sum + Number(item.sentCount || 0), 0)} emails.`
      );
      return;
    }

    setManualBlastSending(true);

    try {
      const subjectText = manualBlastPayload.subject.trim();
      const bodyText = manualBlastPayload.body.trim();
      
      if (!subjectText || !bodyText) {
        throw new Error('Subject and body content are required');
      }
      
      // Escape HTML special characters and convert newlines to <br/>
      const escapedBody = String(bodyText)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br/>');
      
      const renderedHtml = escapedBody;
      let totalSent = 0;
      let failedRecipients = 0;
      const ccValue = manualBlastPayload.cc.trim();

      const nextRecipients = [];

      for (const recipient of manualBlastRecipients) {
        let sentCount = 0;
        let lastError = '';

        for (let attempt = 0; attempt < Number(recipient.count || 1); attempt += 1) {
          try {
            const requestBody = {
              to: recipient.email,
              subject: subjectText,
              templateHtml: renderedHtml,
              templateText: bodyText
            };

            if (ccValue) {
              requestBody.cc = ccValue;
            }

            console.log('Sending email request:', {
              to: requestBody.to,
              subject: requestBody.subject,
              templateHtmlLength: requestBody.templateHtml?.length,
              templateTextLength: requestBody.templateText?.length
            });

            const response = await fetch(`${apiBase}/sendemail/send`, {
              method: 'POST',
              headers: buildAuthHeaders({
                'Content-Type': 'application/json'
              }),
              body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            handleUnauthorized(response, data);

            if (!response.ok) {
              console.error('Email send error response:', data);
              throw new Error(data.message || `Failed to send email to ${recipient.email}`);
            }

            sentCount += 1;
            totalSent += 1;
          } catch (error) {
            console.error('Email send error:', error);
            lastError = error.message || 'Send failed';
            break;
          }
        }

        if (sentCount < Number(recipient.count || 1)) {
          failedRecipients += 1;
        }

        nextRecipients.push({
          ...recipient,
          sentCount,
          lastStatus: sentCount > 0 && !lastError ? 'sent' : sentCount > 0 ? 'partial' : 'failed',
          lastError
        });
      }

      setManualBlastRecipients(nextRecipients);

      if (failedRecipients > 0) {
        setUiError(`${failedRecipients} recipient(s) failed or partially failed. Check status in the Manual Blast modal.`);
      }

      setUiMessage(`Manual blast finished. Sent ${totalSent} email(s).`);
    } catch (error) {
      setUiError(error.message || 'Could not send manual blast');
    } finally {
      setManualBlastSending(false);
    }
  }

  return (
    <main className="dashboard-main">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleScriptReady(true)}
      />

      {showConnectModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Connect Google Sheet</h3>
            <p>Use a Google Sheet ID or full URL with viewer access.</p>
            <form onSubmit={handleCreateForm} className="modal-form">
              <input
                className="modal-input"
                placeholder="Connection name (e.g., Lead Form)"
                value={formPayload.name}
                onChange={(e) => setFormPayload((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="modal-input"
                placeholder="Sheet ID or full sheet URL"
                value={formPayload.sheetId}
                onChange={(e) => setFormPayload((prev) => ({ ...prev, sheetId: e.target.value }))}
              />
              <input
                className="modal-input"
                placeholder="Sheet tab name"
                value={formPayload.sheetName}
                onChange={(e) => setFormPayload((prev) => ({ ...prev, sheetName: e.target.value }))}
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowConnectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingForm}>
                  {savingForm ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manualBlastOpen ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>+ Send Custom Emails</h3>
            <p>Add one or more recipients, choose count per recipient, and send custom emails.</p>

            <form onSubmit={handleSendManualBlast} className="modal-form">
              <textarea
                className="modal-input"
                placeholder="Add recipient emails (comma, space, or newline separated)"
                value={manualBlastRecipientInput}
                onChange={(event) => setManualBlastRecipientInput(event.target.value)}
                rows={3}
              />
              <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="btn-secondary" onClick={handleAddManualRecipients}>
                  Add Recipients
                </button>
              </div>

              {manualBlastRecipients.length ? (
                <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {manualBlastRecipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto auto',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipient.email}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleManualRecipientCountChange(recipient.id, -1)}
                      >
                        -
                      </button>
                      <span title="Emails to send for this recipient">{recipient.count}</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleManualRecipientCountChange(recipient.id, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleRemoveManualRecipient(recipient.id)}
                      >
                        Remove
                      </button>
                      <span style={{ gridColumn: '1 / -1', fontSize: '0.82rem', opacity: 0.85 }}>
                        Sent: {recipient.sentCount || 0}
                        {recipient.lastError ? ` | Error: ${recipient.lastError}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <input
                className="modal-input"
                placeholder="Email subject"
                value={manualBlastPayload.subject}
                onChange={(event) =>
                  setManualBlastPayload((prev) => ({ ...prev, subject: event.target.value }))
                }
              />
              <input
                className="modal-input"
                placeholder="CC (optional, comma separated emails)"
                value={manualBlastPayload.cc}
                onChange={(event) =>
                  setManualBlastPayload((prev) => ({ ...prev, cc: event.target.value }))
                }
              />
              <textarea
                className="modal-input"
                placeholder="Email body"
                rows={8}
                value={manualBlastPayload.body}
                onChange={(event) =>
                  setManualBlastPayload((prev) => ({ ...prev, body: event.target.value }))
                }
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setManualBlastOpen(false);
                    setManualBlastSending(false);
                  }}
                  disabled={manualBlastSending}
                >
                  Close
                </button>
                <button type="submit" className="btn-primary" disabled={manualBlastSending}>
                  {manualBlastSending ? 'Sending...' : 'Send Manual Blast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {campaignModalOpen && campaignPreview ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>Campaign Preview</h3>
            <p>
              {campaignPreview.recipientsCount || 0} recipients matched for a {campaignPreview.campaignType || 'campaign'}.
            </p>
            <div className="campaign-preview-meta">
              <p><strong>Subject:</strong> {campaignPreview.suggestedSubject || 'Untitled campaign'}</p>
              <p><strong>CTA:</strong> {campaignPreview.suggestedCta || 'Reply to continue'}</p>
            </div>
            <div className="preview-list">
              {(campaignPreview.sampleRecipients || []).slice(0, 8).map((recipient) => (
                <div key={recipient.id} className="preview-list-item">
                  <span>{recipient.name || 'Unknown'}</span>
                  <span>{recipient.email || '-'}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setCampaignModalOpen(false)}>
                Close
              </button>
              <button type="button" className="btn-primary" onClick={handleLaunchCampaign}>
                Save Draft
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sidebar */}
      <aside className="dashboard-sidebar open">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="X-CRM Logo" />
          </div>
        </div>

        <div className="sidebar-services">
            <h3 className="sidebar-services-title">Services</h3>
            <div className="sidebar-service-grid">
              <button
                className="sidebar-service-card"
                onClick={() => setActiveTab('forms')}
                title="Sync form responses from Google Sheets"
              >
                <div className="service-icon">📋</div>
                <span>Form Sync</span>
              </button>
              <button
                className="sidebar-service-card"
                onClick={() => setActiveTab('respondents')}
                title="View and analyze respondent data"
              >
                <div className="service-icon">📊</div>
                <span>Respondent Data</span>
              </button>
              <button
                className="sidebar-service-card"
                onClick={() => setActiveTab('campaigns')}
                title="Send custom emails and manage campaigns"
              >
                <div className="service-icon">✉️</div>
                <span>Custom E-Mails</span>
              </button>
            </div>
          </div>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleSignOut}>
            <span className="nav-icon">⇦</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-content-area">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">{tabCopy[activeTab]?.title}</h1>
            <p className="page-subtitle">{tabCopy[activeTab]?.subtitle}</p>
          </div>
          <div className="header-right">
            <div className="theme-toggle-shell">
              <ThemeToggle />
            </div>
            <button className="btn-secondary" onClick={handleRefreshData}>
              Refresh
            </button>
          </div>
        </header>

        {/* Content Sections */}
        <div className="dashboard-workspace">
          {uiError ? <div className="banner-error">{uiError}</div> : null}
          {uiMessage ? <div className="banner-success">{uiMessage}</div> : null}
          {demoMode ? <div className="banner-info">Demo mode is active. Live sync and form connections are disabled.</div> : null}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <section className="dashboard-section hero-panel">
                <div className="hero-copy">
                  <h2>Quick Actions</h2>
                </div>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={handleSyncAllForms} disabled={syncingAll || forms.length === 0}>
                    {syncingAll ? 'Syncing All...' : 'Sync All Forms'}
                  </button>
                  <button className="btn-secondary" onClick={() => setShowConnectModal(true)}>
                    + Connect New Form
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab('campaigns')}>
                    Send Email
                  </button>
                </div>
              </section>

              <div className="overview-grid">
                <section className="dashboard-section">
                  <div className="section-header">
                    <h2>Forms</h2>
                  </div>

                  {forms.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">FM</div>
                      <h3>No forms connected</h3>
                      <p>Connect a Google Form to begin</p>
                    </div>
                  ) : (
                    <div className="forms-list">
                      {forms.map((form) => (
                        <div key={form.id} className="form-item">
                          <div className="form-info">
                            <h3>{form.name}</h3>
                            <p>
                              {form._count?.respondents || 0} submissions | Last sync:{' '}
                              {form.lastSyncedAt ? new Date(form.lastSyncedAt).toLocaleString() : 'Never'}
                            </p>
                          </div>
                          <div className="form-actions">
                            <button
                              className="btn-secondary"
                              onClick={() => handleSyncForm(form.id)}
                              disabled={syncingId === form.id}
                            >
                              {syncingId === form.id ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => handleDeleteForm(form)}
                              disabled={syncingId === form.id}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="dashboard-section">
                  <div className="section-header">
                    <h2>Activity</h2>
                  </div>
                  <div className="activity-list">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="activity-item">
                        <p>{item.message}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Forms</h2>
                <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                  + Connect New Form
                </button>
              </div>
              {forms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">FM</div>
                  <h3>No forms</h3>
                  <p>Connect a Google Form to sync responses</p>
                </div>
              ) : null}

              <div className="forms-grid">
                <div className="add-form-card" onClick={() => setShowConnectModal(true)}>
                  <div className="add-form-icon">+</div>
                  <h3>Connect a Google Form</h3>
                  <p>Link your Google Form to sync responses</p>
                </div>
                {forms.map((form) => (
                  <div key={form.id} className="settings-card">
                    <h3>{form.name}</h3>
                    <p>Sheet tab: {form.sheetName}</p>
                    <p>Status: {form.status}</p>
                    <div className="card-actions">
                      <button className="btn-secondary" onClick={() => setActiveTab('respondents')}>
                        View Leads
                      </button>
                      <button className="btn-secondary" onClick={() => handleSyncForm(form.id)} disabled={syncingId === form.id}>
                        {syncingId === form.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteForm(form)}
                        disabled={syncingId === form.id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Respondents Tab */}
          {activeTab === 'respondents' && (
            <section className="dashboard-section">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <select
                    value={selectedFormFilter}
                    onChange={(e) => {
                      setSelectedFormFilter(e.target.value);
                      setRespondentFieldDropdownOpen(false);
                    }}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-panel-soft)', color: 'var(--dash-text)', cursor: 'pointer' }}
                  >
                    <option value="">All Forms</option>
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name}
                      </option>
                    ))}
                  </select>

                  <div className="filter-dropdown-wrap">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => setRespondentFieldDropdownOpen((prev) => !prev)}
                    >
                      Fields {selectedRespondentFields.length > 0 ? `(${selectedRespondentFields.length})` : '(none)'}
                    </button>
                    {respondentFieldDropdownOpen ? (
                      <div className="field-dropdown-menu">
                        <div className="field-dropdown-header">
                          <strong>Show in table</strong>
                          <span>Unselected fields stay in View</span>
                        </div>
                        {availableRespondentFields.length === 0 ? (
                          <p className="field-dropdown-empty">No additional form fields found.</p>
                        ) : (
                          availableRespondentFields.map((fieldName) => (
                            <label key={fieldName} className="field-dropdown-option">
                              <input
                                type="checkbox"
                                checked={selectedRespondentFields.includes(fieldName)}
                                onChange={() => {
                                  setSelectedRespondentFields((current) =>
                                    current.includes(fieldName)
                                      ? current.filter((item) => item !== fieldName)
                                      : [...current, fieldName]
                                  );
                                }}
                              />
                              <span>{fieldName}</span>
                            </label>
                          ))
                        )}
                        <div className="field-dropdown-actions">
                          <button
                            type="button"
                            className="filter-dropdown-option"
                            onClick={() => setSelectedRespondentFields([])}
                          >
                            Clear all
                          </button>
                          <button
                            type="button"
                            className="filter-dropdown-option"
                            onClick={() => setRespondentFieldDropdownOpen(false)}
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <form className="search-filters" onSubmit={handleRespondentSearch}>
                  <input
                    type="text"
                    placeholder="Search respondents..."
                    className="search-input"
                    value={respondentSearch}
                    onChange={(e) => setRespondentSearch(e.target.value)}
                  />
                  <button className="btn-secondary" type="submit">Search</button>
                  <button className="btn-secondary" type="button" onClick={() => {
                    setRespondentSearch('');
                    runRespondentSearch('').catch((error) => {
                      setUiError(error.message || 'Could not clear search');
                    });
                  }}>
                    Clear
                  </button>
                  <div className="filter-dropdown-wrap">
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => setRespondentFilterOpen((prev) => !prev)}
                    >
                      Filter {respondentSortOrder === 'asc' ? 'A-Z' : respondentSortOrder === 'desc' ? 'Z-A' : 'Off'}
                    </button>
                    {respondentFilterOpen ? (
                      <div className="filter-dropdown-menu">
                        <button
                          className={`filter-dropdown-option ${respondentSortOrder === 'asc' ? 'active' : ''}`}
                          type="button"
                          onClick={() => {
                            setRespondentSortOrder('asc');
                            setRespondentFilterOpen(false);
                          }}
                        >
                          A-Z (Alphabetical)
                        </button>
                        <button
                          className={`filter-dropdown-option ${respondentSortOrder === 'desc' ? 'active' : ''}`}
                          type="button"
                          onClick={() => {
                            setRespondentSortOrder('desc');
                            setRespondentFilterOpen(false);
                          }}
                        >
                          Z-A (Alphabetical)
                        </button>
                        <button
                          className={`filter-dropdown-option ${respondentSortOrder === 'none' ? 'active' : ''}`}
                          type="button"
                          onClick={() => {
                            setRespondentSortOrder('none');
                            setRespondentFilterOpen(false);
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    ) : null}
                  </div>
                </form>
                <button className="btn-primary" onClick={() => setActiveTab('campaigns')}>+ Bulk Email</button>
              </div>

              {respondents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>No respondents yet</h3>
                  <p>Connect a Google Form and run Sync Now to import respondents</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Row</th>
                        {selectedRespondentFieldColumns.map((fieldName) => (
                          <th key={fieldName}>{fieldName}</th>
                        ))}
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRespondents
                        .filter((row) => !selectedFormFilter || row.formConnection?.id === selectedFormFilter)
                        .map((row) => (
                          <tr key={row.id}>
                            <td>{row.name || '-'}</td>
                            <td>{row.email || '-'}</td>
                            <td>{row.sourceRowNumber}</td>
                            {selectedRespondentFieldColumns.map((fieldName) => (
                              <td key={fieldName}>{renderRespondentFieldValue(row?.rawData?.[fieldName])}</td>
                            ))}
                            <td>
                              <button className="btn-secondary table-action" type="button" onClick={() => handleOpenRespondent(row)}>
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {respondentHasMore && !demoMode && (
                    <div className="load-more-wrap" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                      <button
                        className="btn-secondary"
                        onClick={handleLoadMoreRespondents}
                        disabled={loadingMoreRespondents}
                      >
                        {loadingMoreRespondents ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <section className="dashboard-section">
              <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2>Campaign Workspace</h2>
                  <select
                    value={selectedCampaignFormFilter}
                    onChange={(e) => setSelectedCampaignFormFilter(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--dash-border)', backgroundColor: 'var(--dash-panel-soft)', color: 'var(--dash-text)', cursor: 'pointer' }}
                  >
                    <option value="">All Forms</option>
                    {forms.map((form) => (
                      <option key={form.id} value={form.id}>
                        {form.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="card-actions">
                  <button className="btn-secondary" onClick={() => setManualBlastOpen(true)}>
                    Custom Email
                  </button>
                  <button className="btn-primary" onClick={() => handlePrepareCampaign('broadcast')} disabled={campaignLoading}>
                    {campaignLoading ? 'Preparing...' : '+ New Campaign'}
                  </button>
                </div>
              </div>

              <div className="campaign-summary-row">
                <div className="campaign-summary-card">
                  <p className="campaign-summary-label">Total Respondents</p>
                  <h3>{campaignSummary.totalRespondents || 0}</h3>
                </div>
                <div className="campaign-summary-card">
                  <p className="campaign-summary-label">Emailable Contacts</p>
                  <h3>{campaignSummary.emailableRespondents || 0}</h3>
                </div>
                <div className="campaign-summary-card">
                  <p className="campaign-summary-label">Connected Sources</p>
                  <h3>{campaignSummary.forms?.length || 0}</h3>
                </div>
              </div>

              <div className="campaign-grid">
                <div className="settings-card">
                  <h3>Follow-up Sequence</h3>
                  <p>Automated follow-ups</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handlePrepareCampaign('sequence')} disabled={campaignLoading}>
                      Create Sequence
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Segment Broadcast</h3>
                  <p>Send to segments</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handlePrepareCampaign('broadcast')} disabled={campaignLoading}>
                      Create Broadcast
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Delivery Analytics</h3>
                  <p>Track performance</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={fetchCampaignSummary} disabled={campaignLoading}>
                      View Metrics
                    </button>
                  </div>
                </div>
              </div>

              {campaignSummary.forms?.length ? (
                <div className="campaign-sources-list">
                  {campaignSummary.forms
                    .filter((source) => !selectedCampaignFormFilter || source.id === selectedCampaignFormFilter)
                    .map((source) => (
                    <div key={source.id} className="campaign-source-item">
                      <span>{source.name}</span>
                      <strong>{source.respondents} leads</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <section className="dashboard-section">
              <h2>Settings</h2>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Account</h3>
                  <p>Account info</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Edit Account</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Security</h3>
                  <p>Password & security</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Change Password</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Integrations</h3>
                  <p>Connected services</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Manage Integrations</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Billing</h3>
                  <p>Subscription & history</p>
                  <div className="card-actions">
                    <button className="btn-secondary">View Billing</button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {respondentDrawerOpen ? (
        <div className="drawer-overlay" onClick={() => setRespondentDrawerOpen(false)}>
          <aside className="respondent-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <p className="page-kicker">Respondent Profile</p>
                <h3>{selectedRespondent?.name || 'Lead details'}</h3>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setRespondentDrawerOpen(false)}>
                Close
              </button>
            </div>

            {respondentDetailLoading ? <p className="drawer-loading">Loading respondent details...</p> : null}

            {!respondentDetailLoading ? (
              <div className="drawer-body">
                <div className="drawer-top-grid">
                  <div className="drawer-metric">
                    <span>Email</span>
                    <strong>{selectedRespondent?.email || '-'}</strong>
                  </div>
                  <div className="drawer-metric">
                    <span>Source Form</span>
                    <strong>{selectedRespondent?.formConnection?.name || '-'}</strong>
                  </div>
                  <div className="drawer-metric">
                    <span>Sheet Row</span>
                    <strong>{selectedRespondent?.sourceRowNumber || '-'}</strong>
                  </div>
                </div>

                <div className="drawer-data-list">
                  <h4>View Fields</h4>
                  {respondentDetailEntries.length === 0 ? (
                    <p className="drawer-empty">No hidden fields left to show.</p>
                  ) : (
                    respondentDetailEntries.map(([key, value]) => (
                      <div key={key} className="drawer-data-item">
                        <span>{key}</span>
                        <strong>{renderRespondentFieldValue(value)}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
