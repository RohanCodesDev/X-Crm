import { useEffect, useMemo, useState } from 'react';
import Script from 'next/script';
import ThemeToggle from '../components/toggle';

export default function DashboardPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const [authToken, setAuthToken] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const tabCopy = {
    overview: {
      title: 'Performance Overview',
      subtitle: 'Track forms, respondents, and sync health from one place.'
    },
    forms: {
      title: 'Connected Forms',
      subtitle: 'Manage data sources and run response syncs whenever needed.'
    },
    respondents: {
      title: 'Respondent Directory',
      subtitle: 'Search, segment, and prepare outreach from recent submissions.'
    },
    campaigns: {
      title: 'Campaign Workspace',
      subtitle: 'Set up bulk communication workflows for qualified leads.'
    },
    settings: {
      title: 'Workspace Settings',
      subtitle: 'Control account, security, and integration preferences.'
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

    setCampaignSummary({
      totalRespondents: 48,
      emailableRespondents: 48,
      forms: [
        { id: 'demo-form-1', name: 'Website Lead Form', respondents: 31 },
        { id: 'demo-form-2', name: 'Webinar Registration', respondents: 17 }
      ]
    });
  }

  const statsCards = useMemo(
    () => [
      { key: 'forms', label: 'Connected Forms', value: String(stats.connectedForms), marker: 'FM' },
      { key: 'respondents', label: 'Total Respondents', value: String(stats.totalRespondents), marker: 'LE' },
      { key: 'sync', label: 'Sync Runs', value: String(stats.syncRuns), marker: 'SY' },
      { key: 'campaigns', label: 'Email Campaigns', value: String(stats.campaigns), marker: 'CP' }
    ],
    [stats]
  );

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

    return Object.entries(payload).filter(([key]) => Boolean(key));
  }, [selectedRespondent]);

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

      setUiMessage('Form connected successfully. Click Sync Now to import responses.');
      setShowConnectModal(false);
      setFormPayload({ name: '', sheetId: '', sheetName: 'Form Responses 1' });
      await Promise.all([fetchForms(), fetchStats()]);
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
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="X-CRM Logo" />
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {sidebarOpen ? (
          <div className="sidebar-context">
            <p className="sidebar-context-label">Workspace</p>
            <p className="sidebar-context-value">Lead Operations</p>
            <span className={`workspace-status ${demoMode ? 'demo' : 'live'}`}>
              {demoMode ? 'Demo Session' : 'Live Session'}
            </span>
          </div>
        ) : null}

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">📊</span>
            {sidebarOpen && <span>Overview</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'forms' ? 'active' : ''}`}
            onClick={() => setActiveTab('forms')}
          >
            <span className="nav-icon">📋</span>
            {sidebarOpen && <span>Forms</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'respondents' ? 'active' : ''}`}
            onClick={() => setActiveTab('respondents')}
          >
            <span className="nav-icon">👥</span>
            {sidebarOpen && <span>Respondents</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'campaigns' ? 'active' : ''}`}
            onClick={() => setActiveTab('campaigns')}
          >
            <span className="nav-icon">📧</span>
            {sidebarOpen && <span>Campaigns</span>}
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span>
            {sidebarOpen && <span>Settings</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleSignOut}>
            <span className="nav-icon">⇦</span>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-content-area">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <p className="page-kicker">CRM Workspace</p>
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
                  <h2>Team Snapshot</h2>
                  <p>Use quick actions to keep data fresh and your outreach moving.</p>
                </div>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={handleSyncAllForms} disabled={syncingAll || forms.length === 0}>
                    {syncingAll ? 'Syncing All...' : 'Sync All Forms'}
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab('respondents')}>
                    Open Respondents
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab('campaigns')}>
                    Create Email Campaign
                  </button>
                </div>
              </section>

              {/* Stats Grid */}
              <div className="stats-grid">
                {statsCards.map((stat) => (
                  <div key={stat.key} className="stat-card">
                    <div className="stat-icon">{stat.marker}</div>
                    <div className="stat-content">
                      <p className="stat-label">{stat.label}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                    </div>
                  </div>
                ))}
              </div>

              <div className="overview-grid">
                <section className="dashboard-section">
                  <div className="section-header">
                    <h2>Connected Forms</h2>
                    <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                      + Connect New Form
                    </button>
                  </div>

                  {forms.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">FM</div>
                      <h3>No forms connected yet</h3>
                      <p>Connect your first Google Form to get started with X-CRM.</p>
                      <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                        Connect Your First Form
                      </button>
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
                            <button className="btn-secondary" onClick={() => setActiveTab('respondents')}>
                              View Responses
                            </button>
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
                    <h2>Recent Activity</h2>
                  </div>
                  <div className="activity-list">
                    {recentActivity.map((item) => (
                      <div key={item.id} className="activity-item">
                        <div className="activity-icon">AC</div>
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
                <h2>Your Connected Forms</h2>
                <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                  + Connect New Form
                </button>
              </div>
              {forms.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">FM</div>
                  <h3>No forms configured</h3>
                  <p>Connect a Google Form to start collecting and syncing responses.</p>
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
                        <th>Form</th>
                        <th>Row</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRespondents.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name || '-'}</td>
                          <td>{row.email || '-'}</td>
                          <td>{row.formConnection?.name || '-'}</td>
                          <td>{row.sourceRowNumber}</td>
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
                <h2>Email Campaigns</h2>
                <button className="btn-primary" onClick={() => handlePrepareCampaign('broadcast')} disabled={campaignLoading}>
                  {campaignLoading ? 'Preparing...' : '+ New Campaign'}
                </button>
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
                  <p>Draft onboarding and qualification follow-ups from synced leads.</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handlePrepareCampaign('sequence')} disabled={campaignLoading}>
                      Create Sequence
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Segment Broadcast</h3>
                  <p>Send one update to filtered respondent segments by form source.</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={() => handlePrepareCampaign('broadcast')} disabled={campaignLoading}>
                      Create Broadcast
                    </button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Delivery Analytics</h3>
                  <p>Monitor open rate and click performance for recent campaigns.</p>
                  <div className="card-actions">
                    <button className="btn-secondary" onClick={fetchCampaignSummary} disabled={campaignLoading}>
                      View Metrics
                    </button>
                  </div>
                </div>
              </div>

              {campaignSummary.forms?.length ? (
                <div className="campaign-sources-list">
                  {campaignSummary.forms.map((source) => (
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
              <h2>Account Settings</h2>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Account</h3>
                  <p>Manage your account information and preferences</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Edit Account</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Security</h3>
                  <p>Update your password and security settings</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Change Password</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Integrations</h3>
                  <p>Manage connected services and API keys</p>
                  <div className="card-actions">
                    <button className="btn-secondary">Manage Integrations</button>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>Billing</h3>
                  <p>View your subscription and billing history</p>
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
                  <h4>Captured Form Fields</h4>
                  {respondentDetailEntries.length === 0 ? (
                    <p className="drawer-empty">No additional fields available.</p>
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
