import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  getSettings,
  updateAccount,
  updateProfile,
  updatePrivacy,
  updatePreferences,
  updateNotifications,
  updateEmailNotifications,
  deleteAccount,
} from '../api/settings';

const TABS = ['Account', 'Profile', 'Privacy', 'Preferences', 'Notifications', 'Email'];

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg-page)',
  },
  sidebar: {
    width: 240,
    padding: '24px 0',
    borderRight: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    flexShrink: 0,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0 24px 12px',
  },
  tabBtn: (active) => ({
    width: '100%',
    textAlign: 'left',
    padding: '8px 24px',
    background: active ? 'var(--hover-bg)' : 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: active ? 'var(--orange)' : 'var(--text)',
    borderLeft: active ? '3px solid var(--orange)' : '3px solid transparent',
  }),
  content: {
    flex: 1,
    padding: '32px 48px',
    maxWidth: 720,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    marginTop: 32,
    color: 'var(--text)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid var(--border)',
    gap: 16,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--text)',
  },
  rowSublabel: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 4,
  },
  saveBtn: {
    background: 'var(--orange)',
    color: 'white',
    border: 'none',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  saveBtnDisabled: {
    background: 'var(--muted)',
    color: 'white',
    border: 'none',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'not-allowed',
    flexShrink: 0,
    opacity: 0.6,
  },
  dangerBtn: {
    background: 'none',
    color: '#ff4500',
    border: '1px solid #ff4500',
    borderRadius: 20,
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 14,
    color: 'var(--text)',
    minWidth: 220,
  },
  select: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 14,
    color: 'var(--text)',
    minWidth: 160,
    cursor: 'pointer',
  },
  textarea: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '8px 12px',
    fontSize: 14,
    color: 'var(--text)',
    minWidth: 220,
    minHeight: 80,
    resize: 'vertical',
    fontFamily: 'var(--font)',
  },
  feedback: (ok) => ({
    fontSize: 12,
    color: ok ? 'var(--blue)' : '#ff4500',
    marginTop: 6,
  }),
  badge: (connected) => ({
    fontSize: 12,
    fontWeight: 600,
    color: connected ? '#46d160' : 'var(--muted)',
    background: connected ? 'rgba(70,209,96,0.12)' : 'var(--pill-bg)',
    borderRadius: 12,
    padding: '4px 10px',
  }),
  footer: {
    marginTop: 48,
    paddingTop: 24,
    borderTop: '1px solid var(--border)',
    fontSize: 12,
    color: 'var(--muted)',
    lineHeight: 1.8,
  },
};

// Toggle component
function Toggle({ checked, onChange }) {
  return (
    <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span style={{
        position: 'absolute', inset: 0,
        background: checked ? 'var(--orange)' : 'var(--border)',
        borderRadius: 24,
        transition: 'background 0.2s',
      }} />
      <span style={{
        position: 'absolute',
        top: 3, left: checked ? 23 : 3,
        width: 18, height: 18,
        background: 'white',
        borderRadius: '50%',
        transition: 'left 0.2s',
      }} />
    </label>
  );
}

function SaveBar({ onSave, loading, feedback }) {
  return (
    <div style={{ marginTop: 24 }}>
      <button style={loading ? styles.saveBtnDisabled : styles.saveBtn} onClick={onSave} disabled={loading}>
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
      {feedback && <div style={styles.feedback(feedback.ok)}>{feedback.msg}</div>}
    </div>
  );
}

function Footer() {
  return (
    <div style={styles.footer}>
      Reddit Rules · Privacy Policy · User Agreement · Accessibility · Reddit, Inc. © 2026. All rights reserved.
    </div>
  );
}

// ── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ settings, user, onRefresh }) {
  const [gender, setGender] = useState(settings?.account?.gender || '');
  const [useLocation, setUseLocation] = useState(settings?.account?.useApproxLocation ?? false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updateAccount({ gender, useApproxLocation: useLocation });
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  const handleDelete = async () => {
    const res = await deleteAccount();
    if (res.success) {
      localStorage.removeItem('accessToken');
      navigate('/Login');
    } else {
      setFeedback({ ok: false, msg: res.message || 'Error deleting account.' });
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div>
      <div style={styles.sectionTitle}>General</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Email address</div>
          <div style={styles.rowSublabel}>{user?.email || '—'}</div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Read-only</span>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Gender</div>
        </div>
        <select style={styles.select} value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">Prefer not to say</option>
          <option value="man">Man</option>
          <option value="woman">Woman</option>
          <option value="nonbinary">Non-binary</option>
        </select>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Location customization</div>
          <div style={styles.rowSublabel}>Use approximate location (based on IP)</div>
        </div>
        <Toggle checked={useLocation} onChange={setUseLocation} />
      </div>

      <SaveBar onSave={save} loading={loading} feedback={feedback} />

      <div style={styles.sectionTitle}>Account authorization</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Google</div>
          <div style={styles.rowSublabel}>Connect your Google account</div>
        </div>
        <span style={styles.badge(user?.googleConnected)}>
          {user?.googleConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <div style={styles.sectionTitle}>Advanced</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Delete account</div>
          <div style={styles.rowSublabel}>Permanently delete your Reddit account and all data</div>
        </div>
        {!showDeleteConfirm ? (
          <button style={styles.dangerBtn} onClick={() => setShowDeleteConfirm(true)}>Delete account</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Are you sure?</span>
            <button style={styles.dangerBtn} onClick={handleDelete}>Yes, delete</button>
            <button style={styles.saveBtn} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab({ settings }) {
  const [displayName, setDisplayName] = useState(settings?.profile?.displayName || '');
  const [about, setAbout] = useState(settings?.profile?.about || '');
  const [nsfw, setNsfw] = useState(settings?.profile?.nsfw ?? false);
  const [showFollowers, setShowFollowers] = useState(settings?.profile?.showFollowerCount ?? true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updateProfile({ displayName, about, nsfw, showFollowerCount: showFollowers });
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Profile saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  return (
    <div>
      <div style={{ ...styles.sectionTitle, marginTop: 0 }}>Profile</div>

      <div style={styles.row}>
        <div><div style={styles.rowLabel}>Display name</div></div>
        <input style={styles.input} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Optional display name" />
      </div>

      <div style={{ ...styles.row, alignItems: 'flex-start' }}>
        <div style={{ paddingTop: 4 }}><div style={styles.rowLabel}>About</div><div style={styles.rowSublabel}>A brief description of yourself</div></div>
        <textarea style={styles.textarea} value={about} onChange={e => setAbout(e.target.value)} placeholder="Tell us about yourself…" />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Avatar</div>
          <div style={styles.rowSublabel}>Customize your profile picture</div>
        </div>
        <button style={styles.saveBtn} onClick={() => navigate('/avatar/edit')}>Edit avatar</button>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Banner</div>
          <div style={styles.rowSublabel}>Upload a profile banner image</div>
        </div>
        <button style={{ ...styles.saveBtn, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          Upload banner
        </button>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>NSFW</div>
          <div style={styles.rowSublabel}>Mark your profile as mature (18+)</div>
        </div>
        <Toggle checked={nsfw} onChange={setNsfw} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Show follower count</div>
          <div style={styles.rowSublabel}>Display your follower count on your profile</div>
        </div>
        <Toggle checked={showFollowers} onChange={setShowFollowers} />
      </div>

      <SaveBar onSave={save} loading={loading} feedback={feedback} />
      <Footer />
    </div>
  );
}

// ── Privacy Tab ───────────────────────────────────────────────────────────────
function PrivacyTab({ settings }) {
  const p = settings?.privacy || {};
  const [allowFollow, setAllowFollow] = useState(p.allowFollow ?? true);
  const [chatRequests, setChatRequests] = useState(p.chatRequests || 'Everyone');
  const [listProfile, setListProfile] = useState(p.listProfile ?? true);
  const [showInSearch, setShowInSearch] = useState(p.showInSearch ?? true);
  const [personalizeAds, setPersonalizeAds] = useState(p.personalizeAds ?? true);
  const [partnerAdInfo, setPartnerAdInfo] = useState(p.partnerAdInfo ?? false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updatePrivacy({ allowFollow, chatRequests, listProfile, showInSearch, personalizeAds, partnerAdInfo });
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Privacy settings saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  return (
    <div>
      <div style={{ ...styles.sectionTitle, marginTop: 0 }}>Privacy</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Allow people to follow you</div>
          <div style={styles.rowSublabel}>Followers can see your posts and comments</div>
        </div>
        <Toggle checked={allowFollow} onChange={setAllowFollow} />
      </div>

      <div style={styles.row}>
        <div><div style={styles.rowLabel}>Who can send you chat requests</div></div>
        <select style={styles.select} value={chatRequests} onChange={e => setChatRequests(e.target.value)}>
          <option value="Everyone">Everyone</option>
          <option value="Nobody">Nobody</option>
        </select>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Blocked accounts</div>
          <div style={styles.rowSublabel}>Manage accounts you've blocked</div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>No blocked accounts</span>
      </div>

      <div style={styles.sectionTitle}>Discoverability</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>List your profile</div>
          <div style={styles.rowSublabel}>Allow your profile to be listed in Reddit directories</div>
        </div>
        <Toggle checked={listProfile} onChange={setListProfile} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Show up in search results</div>
          <div style={styles.rowSublabel}>Allow search engines to index your profile</div>
        </div>
        <Toggle checked={showInSearch} onChange={setShowInSearch} />
      </div>

      <div style={styles.sectionTitle}>Advertising</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Personalize ads</div>
          <div style={styles.rowSublabel}>Allow Reddit to show you personalized ads</div>
        </div>
        <Toggle checked={personalizeAds} onChange={setPersonalizeAds} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Allow partner ad info</div>
          <div style={styles.rowSublabel}>Share limited info with ad partners</div>
        </div>
        <Toggle checked={partnerAdInfo} onChange={setPartnerAdInfo} />
      </div>

      <SaveBar onSave={save} loading={loading} feedback={feedback} />
      <Footer />
    </div>
  );
}

// ── Preferences Tab ───────────────────────────────────────────────────────────
function PreferencesTab({ settings }) {
  const pr = settings?.preferences || {};
  const [language, setLanguage] = useState(pr.language || 'en-US');
  const [showMature, setShowMature] = useState(pr.showMature ?? false);
  const [blurMature, setBlurMature] = useState(pr.blurMature ?? true);
  const [recommendations, setRecommendations] = useState(pr.recommendations ?? true);
  const [autoplay, setAutoplay] = useState(pr.autoplay ?? true);
  const [reduceMotion, setReduceMotion] = useState(pr.reduceMotion ?? false);
  const [displayMode, setDisplayMode] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [communityThemes, setCommunityThemes] = useState(pr.communityThemes ?? true);
  const [openInNewTab, setOpenInNewTab] = useState(pr.openInNewTab ?? false);
  const [feedView, setFeedView] = useState(pr.feedView || 'card');
  const [markdownEditor, setMarkdownEditor] = useState(pr.markdownEditor ?? false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleDisplayMode = (val) => {
    setDisplayMode(val);
    if (val !== 'auto') {
      document.documentElement.setAttribute('data-theme', val);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  };

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updatePreferences({ language, showMature, blurMature, recommendations, autoplay, reduceMotion, displayMode, communityThemes, openInNewTab, feedView, markdownEditor });
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Preferences saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  return (
    <div>
      <div style={{ ...styles.sectionTitle, marginTop: 0 }}>Display</div>

      <div style={styles.row}>
        <div><div style={styles.rowLabel}>Display language</div></div>
        <select style={styles.select} value={language} onChange={e => setLanguage(e.target.value)}>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      <div style={styles.sectionTitle}>Content</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Show mature content (18+)</div>
          <div style={styles.rowSublabel}>View adult-only communities and content</div>
        </div>
        <Toggle checked={showMature} onChange={setShowMature} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Blur mature images</div>
          <div style={styles.rowSublabel}>Blurs thumbnails for NSFW posts</div>
        </div>
        <Toggle checked={blurMature} onChange={setBlurMature} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Show recommendations in home feed</div>
          <div style={styles.rowSublabel}>Include suggested posts from communities you don't follow</div>
        </div>
        <Toggle checked={recommendations} onChange={setRecommendations} />
      </div>

      <div style={styles.sectionTitle}>Accessibility</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Autoplay media</div>
          <div style={styles.rowSublabel}>Automatically play videos and GIFs</div>
        </div>
        <Toggle checked={autoplay} onChange={setAutoplay} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Reduce motion</div>
          <div style={styles.rowSublabel}>Minimize animations and transitions</div>
        </div>
        <Toggle checked={reduceMotion} onChange={setReduceMotion} />
      </div>

      <div style={styles.sectionTitle}>Experience</div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Display mode</div>
          <div style={styles.rowSublabel}>Choose your preferred color theme</div>
        </div>
        <select style={styles.select} value={displayMode} onChange={e => handleDisplayMode(e.target.value)}>
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Use community themes</div>
          <div style={styles.rowSublabel}>Show custom community colors and banners</div>
        </div>
        <Toggle checked={communityThemes} onChange={setCommunityThemes} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Open posts in new tab</div>
        </div>
        <Toggle checked={openInNewTab} onChange={setOpenInNewTab} />
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Default feed view</div>
        </div>
        <select style={styles.select} value={feedView} onChange={e => setFeedView(e.target.value)}>
          <option value="card">Card</option>
          <option value="compact">Compact</option>
          <option value="classic">Classic</option>
        </select>
      </div>

      <div style={styles.row}>
        <div>
          <div style={styles.rowLabel}>Default to markdown editor</div>
          <div style={styles.rowSublabel}>Use markdown when creating posts</div>
        </div>
        <Toggle checked={markdownEditor} onChange={setMarkdownEditor} />
      </div>

      <SaveBar onSave={save} loading={loading} feedback={feedback} />
      <Footer />
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
const NOTIFICATION_SECTIONS = [
  {
    title: 'Messages',
    fields: [
      { key: 'chatMessages', label: 'Chat messages' },
      { key: 'chatRequestsNotif', label: 'Chat requests' },
    ],
  },
  {
    title: 'Activity',
    fields: [
      { key: 'mentions', label: 'Username mentions' },
      { key: 'commentsOnPosts', label: 'Comments on your posts' },
      { key: 'upvotesOnPosts', label: 'Upvotes on your posts' },
      { key: 'upvotesOnComments', label: 'Upvotes on your comments' },
      { key: 'repliesToComments', label: 'Replies to your comments' },
      { key: 'newFollowers', label: 'New followers' },
      { key: 'awards', label: 'Awards' },
      { key: 'postsYouFollow', label: 'Activity on posts you follow' },
    ],
  },
  {
    title: 'Recommendations',
    fields: [
      { key: 'trendingPosts', label: 'Trending posts' },
      { key: 'featuredContent', label: 'Featured content' },
    ],
  },
  {
    title: 'Updates',
    fields: [
      { key: 'breakingNews', label: 'Breaking news' },
      { key: 'redditAnnouncements', label: 'Reddit announcements' },
      { key: 'cakeDay', label: 'Cake day reminders' },
      { key: 'modNotifications', label: 'Moderator notifications' },
    ],
  },
];

function NotificationsTab({ settings }) {
  const defaults = {};
  NOTIFICATION_SECTIONS.forEach(s => s.fields.forEach(f => { defaults[f.key] = 'on'; }));

  const [values, setValues] = useState({ ...defaults, ...(settings?.notifications || {}) });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updateNotifications(values);
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Notification preferences saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  return (
    <div>
      {NOTIFICATION_SECTIONS.map(section => (
        <div key={section.title}>
          <div style={{ ...styles.sectionTitle, marginTop: section.title === NOTIFICATION_SECTIONS[0].title ? 0 : 32 }}>
            {section.title}
          </div>
          {section.fields.map(field => (
            <div key={field.key} style={styles.row}>
              <div style={styles.rowLabel}>{field.label}</div>
              <select
                style={styles.select}
                value={values[field.key] || 'on'}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
              >
                <option value="on">All on</option>
                <option value="off">All off</option>
              </select>
            </div>
          ))}
        </div>
      ))}

      <SaveBar onSave={save} loading={loading} feedback={feedback} />
      <Footer />
    </div>
  );
}

// ── Email Tab ─────────────────────────────────────────────────────────────────
const EMAIL_SECTIONS = [
  {
    title: 'Messages',
    fields: [
      { key: 'messages', label: 'Messages' },
      { key: 'chatRequests', label: 'Chat requests' },
    ],
  },
  {
    title: 'Activity',
    fields: [
      { key: 'commentsOnPosts', label: 'Comments on your posts' },
      { key: 'repliesToComments', label: 'Replies to your comments' },
      { key: 'upvotesOnPosts', label: 'Upvotes on your posts' },
      { key: 'upvotesOnComments', label: 'Upvotes on your comments' },
      { key: 'usernameMentions', label: 'Username mentions' },
      { key: 'newFollowers', label: 'New followers' },
    ],
  },
  {
    title: 'Newsletters',
    fields: [
      { key: 'dailyDigest', label: 'Daily Digest' },
      { key: 'weeklyRecap', label: 'Weekly Recap' },
      { key: 'weeklyTopic', label: 'Weekly Topic' },
    ],
  },
];

function EmailTab({ settings }) {
  const defaults = {};
  EMAIL_SECTIONS.forEach(s => s.fields.forEach(f => { defaults[f.key] = false; }));

  const [values, setValues] = useState({ ...defaults, ...(settings?.email || {}) });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const save = async () => {
    setLoading(true);
    setFeedback(null);
    const res = await updateEmailNotifications(values);
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Email preferences saved!' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  const unsubscribeAll = async () => {
    const allOff = {};
    Object.keys(values).forEach(k => { allOff[k] = false; });
    setValues(allOff);
    setLoading(true);
    setFeedback(null);
    const res = await updateEmailNotifications(allOff);
    setLoading(false);
    setFeedback(res.success ? { ok: true, msg: 'Unsubscribed from all emails.' } : { ok: false, msg: res.message || 'Error saving.' });
  };

  return (
    <div>
      {EMAIL_SECTIONS.map(section => (
        <div key={section.title}>
          <div style={{ ...styles.sectionTitle, marginTop: section.title === EMAIL_SECTIONS[0].title ? 0 : 32 }}>
            {section.title}
          </div>
          {section.fields.map(field => (
            <div key={field.key} style={styles.row}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!values[field.key]}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--orange)', cursor: 'pointer' }}
                />
                <span style={styles.rowLabel}>{field.label}</span>
              </label>
            </div>
          ))}
        </div>
      ))}

      <SaveBar onSave={save} loading={loading} feedback={feedback} />

      <div style={{ marginTop: 24 }}>
        <button
          onClick={unsubscribeAll}
          style={{ background: 'none', border: 'none', color: 'var(--orange)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
        >
          Unsubscribe from all emails
        </button>
      </div>

      <Footer />
    </div>
  );
}

// ── Main SettingsPage ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Account');
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    getSettings().then(res => {
      if (res.success) {
        setSettings(res.settings);
        setUser(res.user);
      } else {
        setLoadError(res.message || 'Failed to load settings.');
      }
    });
  }, []);

  const renderTab = () => {
    if (!settings && !loadError) return <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 40 }}>Loading…</div>;
    if (loadError) return <div style={{ color: '#ff4500', fontSize: 14, marginTop: 40 }}>{loadError}</div>;

    switch (activeTab) {
      case 'Account': return <AccountTab settings={settings} user={user} />;
      case 'Profile': return <ProfileTab settings={settings} />;
      case 'Privacy': return <PrivacyTab settings={settings} />;
      case 'Preferences': return <PreferencesTab settings={settings} />;
      case 'Notifications': return <NotificationsTab settings={settings} />;
      case 'Email': return <EmailTab settings={settings} />;
      default: return null;
    }
  };

  return (
    <Layout>
      <div style={styles.container}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Settings</div>
          {TABS.map(tab => (
            <button
              key={tab}
              style={styles.tabBtn(activeTab === tab)}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={styles.content}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4, marginTop: 0 }}>
            {activeTab}
          </h1>
          <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 8 }} />
          {renderTab()}
        </main>
      </div>
    </Layout>
  );
}
