import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mock data
  const stats = [
    { label: 'Connected Forms', value: '0', icon: '📋' },
    { label: 'Total Respondents', value: '0', icon: '👥' },
    { label: 'This Month', value: '0', icon: '📈' },
    { label: 'Email Campaigns', value: '0', icon: '📧' },
  ];

  const forms = [
    { id: 1, name: 'Customer Feedback', submissions: 0, lastSync: 'Never', status: 'active' },
    { id: 2, name: 'Event Registration', submissions: 0, lastSync: 'Never', status: 'active' },
  ];

  const recentActivity = [
    { id: 1, type: 'form_created', message: 'You created a new form connection' },
    { id: 2, type: 'submission_received', message: 'New form submission received' },
    { id: 3, type: 'campaign_sent', message: 'Email campaign sent to 5 respondents' },
  ];

  return (
    <main className="dashboard-main">
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
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="stats-grid">
                {stats.map((stat, idx) => (
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
                  <button className="btn-primary">+ Connect New Form</button>
                </div>

                {forms.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No forms connected yet</h3>
                    <p>Connect your first Google Form to get started with X-CRM</p>
                    <button className="btn-primary">Connect Your First Form</button>
                  </div>
                ) : (
                  <div className="forms-list">
                    {forms.map((form) => (
                      <div key={form.id} className="form-item">
                        <div className="form-info">
                          <h3>{form.name}</h3>
                          <p>{form.submissions} submissions • Last sync: {form.lastSync}</p>
                        </div>
                        <div className="form-actions">
                          <button className="btn-secondary">View Responses</button>
                          <button className="btn-secondary">Sync Now</button>
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
                <button className="btn-primary">+ Connect New Form</button>
              </div>
              <div className="forms-grid">
                <div className="add-form-card">
                  <div className="add-form-icon">+</div>
                  <h3>Connect a Google Form</h3>
                  <p>Link your Google Form to sync responses</p>
                </div>
              </div>
            </section>
          )}

          {/* Respondents Tab */}
          {activeTab === 'respondents' && (
            <section className="dashboard-section">
              <div className="section-header">
                <div className="search-filters">
                  <input type="text" placeholder="Search respondents..." className="search-input" />
                  <button className="btn-secondary">Filter</button>
                  <button className="btn-secondary">Sort</button>
                </div>
                <button className="btn-primary">+ Bulk Email</button>
              </div>
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No respondents yet</h3>
                <p>Connect a Google Form to import respondents</p>
              </div>
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
