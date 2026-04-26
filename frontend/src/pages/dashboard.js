import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    connectedForms: 0,
    totalRespondents: 0,
    syncRuns: 0,
    campaigns: 0
  });
  const [forms, setForms] = useState([]);
  const [respondents, setRespondents] = useState([]);
  const [respondentSearch, setRespondentSearch] = useState('');
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

  const statsCards = useMemo(
    () => [
      { label: 'Connected Forms', value: String(stats.connectedForms), icon: '📋' },
      { label: 'Total Respondents', value: String(stats.totalRespondents), icon: '👥' },
      { label: 'Sync Runs', value: String(stats.syncRuns), icon: '📈' },
      { label: 'Email Campaigns', value: String(stats.campaigns), icon: '📧' }
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

  async function fetchStats() {
    const response = await fetch(`${apiBase}/crm/stats`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not fetch stats');
    setStats(data);
  }

  async function fetchForms() {
    const response = await fetch(`${apiBase}/crm/forms`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not fetch forms');
    setForms(data.forms || []);
  }

  async function fetchRespondents(searchValue = '') {
    const query = searchValue ? `?q=${encodeURIComponent(searchValue)}` : '';
    const response = await fetch(`${apiBase}/crm/respondents${query}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not fetch respondents');
    setRespondents(data.respondents || []);
  }

  async function bootstrap() {
    try {
      setUiError('');
      await Promise.all([fetchStats(), fetchForms(), fetchRespondents()]);
    } catch (error) {
      setUiError(error.message || 'Failed to load CRM data');
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (activeTab === 'respondents') {
      fetchRespondents(respondentSearch).catch((error) => {
        setUiError(error.message || 'Failed to search respondents');
      });
    }
  }, [activeTab]);

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

    const sheetId = parseSheetId(formPayload.sheetId);
    if (!formPayload.name || !sheetId) {
      setUiError('Form name and Sheet ID/URL are required');
      return;
    }

    try {
      setSavingForm(true);
      const response = await fetch(`${apiBase}/crm/forms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formPayload.name.trim(),
          sheetId,
          sheetName: formPayload.sheetName.trim() || 'Form Responses 1'
        })
      });

      const data = await response.json();
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
    try {
      setSyncingId(formId);
      setUiError('');
      setUiMessage('');

      const response = await fetch(`${apiBase}/crm/forms/${formId}/sync`, {
        method: 'POST'
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Sync failed');

      setUiMessage(`Sync complete. Imported ${data.importedCount || 0} rows.`);
      await Promise.all([fetchForms(), fetchStats(), fetchRespondents(respondentSearch)]);
    } catch (error) {
      setUiError(error.message || 'Sync failed');
    } finally {
      setSyncingId('');
    }
  }

  async function handleRespondentSearch(event) {
    event.preventDefault();
    try {
      setUiError('');
      await fetchRespondents(respondentSearch);
    } catch (error) {
      setUiError(error.message || 'Could not search respondents');
    }
  }

  return (
    <main className="dashboard-main">
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

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">X-CRM</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

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
          <Link href="/">
            <button className="sidebar-logout">
              <span className="nav-icon">🚪</span>
              {sidebarOpen && <span>Sign Out</span>}
            </button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="dashboard-content-area">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <h1 className="page-title">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'forms' && 'Connected Forms'}
              {activeTab === 'respondents' && 'Respondents'}
              {activeTab === 'campaigns' && 'Email Campaigns'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="page-subtitle">
              {activeTab === 'overview' && 'Welcome back! Here\'s your X-CRM overview.'}
              {activeTab === 'forms' && 'Manage your Google Forms connections.'}
              {activeTab === 'respondents' && 'View and manage all form respondents.'}
              {activeTab === 'campaigns' && 'Send bulk emails to respondents.'}
              {activeTab === 'settings' && 'Configure your account and preferences.'}
            </p>
          </div>
          <div className="header-right">
            <input
              type="text"
              className="search-box"
              placeholder="Search..."
            />
            <button className="notification-button">🔔</button>
            <button className="profile-button">👤</button>
          </div>
        </header>

        {/* Content Sections */}
        <div className="dashboard-workspace">
          {uiError ? <div className="banner-error">{uiError}</div> : null}
          {uiMessage ? <div className="banner-success">{uiMessage}</div> : null}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                {statsCards.map((stat, idx) => (
                  <div key={idx} className="stat-card">
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-content">
                      <p className="stat-label">{stat.label}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected Forms Section */}
              <section className="dashboard-section">
                <div className="section-header">
                  <h2>Connected Forms</h2>
                  <button className="btn-primary" onClick={() => setShowConnectModal(true)}>
                    + Connect New Form
                  </button>
                </div>

                {forms.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No forms connected yet</h3>
                    <p>Connect your first Google Form to get started with X-CRM</p>
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
                            {form._count?.respondents || 0} submissions • Last sync:{' '}
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
                          <button className="btn-icon">⋮</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Activity */}
              <section className="dashboard-section">
                <div className="section-header">
                  <h2>Recent Activity</h2>
                </div>
                <div className="activity-list">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="activity-item">
                      <div className="activity-icon">
                        {item.type === 'form_created' && '✨'}
                        {item.type === 'submission_received' && '📥'}
                        {item.type === 'campaign_sent' && '📤'}
                      </div>
                      <p>{item.message}</p>
                    </div>
                  ))}
                </div>
              </section>
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
                    <button className="btn-secondary" onClick={() => handleSyncForm(form.id)}>
                      {syncingId === form.id ? 'Syncing...' : 'Sync Now'}
                    </button>
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
                </form>
                <button className="btn-primary">+ Bulk Email</button>
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
                      </tr>
                    </thead>
                    <tbody>
                      {respondents.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name || '-'}</td>
                          <td>{row.email || '-'}</td>
                          <td>{row.formConnection?.name || '-'}</td>
                          <td>{row.sourceRowNumber}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2>Email Campaigns</h2>
                <button className="btn-primary">+ New Campaign</button>
              </div>
              <div className="empty-state">
                <div className="empty-icon">📧</div>
                <h3>No campaigns yet</h3>
                <p>Create your first email campaign to respondents</p>
              </div>
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
                  <button className="btn-secondary">Edit Account</button>
                </div>
                <div className="settings-card">
                  <h3>Security</h3>
                  <p>Update your password and security settings</p>
                  <button className="btn-secondary">Change Password</button>
                </div>
                <div className="settings-card">
                  <h3>Integrations</h3>
                  <p>Manage connected services and API keys</p>
                  <button className="btn-secondary">Manage Integrations</button>
                </div>
                <div className="settings-card">
                  <h3>Billing</h3>
                  <p>View your subscription and billing history</p>
                  <button className="btn-secondary">View Billing</button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
