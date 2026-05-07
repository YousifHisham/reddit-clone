import { useState } from 'react';
import { createCommunity } from '../api/communities';

const COMMUNITY_TOPICS = [
  { emoji: '🍣', label: 'Anime & Cosplay' },
  { emoji: '🧑‍🎨', label: 'Art' },
  { emoji: '💵', label: 'Business & Finance' },
  { emoji: '🧩', label: 'Collectibles & Other Hobbies' },
  { emoji: '🧑‍🏫', label: 'Education & Career' },
  { emoji: '🪞', label: 'Fashion & Beauty' },
  { emoji: '🍔', label: 'Food & Drinks' },
  { emoji: '🕹️', label: 'Games' },
  { emoji: '❤️‍🩹', label: 'Health' },
  { emoji: '🏡', label: 'Home & Garden' },
  { emoji: '📜', label: 'Humanities & Law' },
  { emoji: '🌈', label: 'Identity & Relationships' },
  { emoji: '🙉', label: 'Internet Culture' },
  { emoji: '🎞️', label: 'Movies & TV' },
  { emoji: '🎶', label: 'Music' },
  { emoji: '🌿', label: 'Nature & Outdoors' },
  { emoji: '📰', label: 'News & Politics' },
  { emoji: '🌐', label: 'Places & Travel' },
  { emoji: '✨', label: 'Pop Culture' },
  { emoji: '✏️', label: 'Q&As & Stories' },
  { emoji: '📖', label: 'Reading & Writing' },
  { emoji: '🧪', label: 'Sciences' },
  { emoji: '💀', label: 'Spooky' },
  { emoji: '🏅', label: 'Sports' },
  { emoji: '🛰️', label: 'Technology' },
  { emoji: '🚗', label: 'Vehicles' },
  { emoji: '🧘', label: 'Wellness' },
];

export default function CreateCommunityModal({ onClose, onCreated }) {
  const [page, setPage] = useState(1);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [communityType, setCommunityType] = useState('public');
  const [matureToggle, setMatureToggle] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseColor, setBaseColor] = useState('#ff4500');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [createdCommunity, setCreatedCommunity] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    const data = await createCommunity({ name, description, category: selectedTopic || 'General' });
    setLoading(false);
    if (data.success) {
      setCreatedCommunity(data.community);
      onCreated(data.community);
      setPage(4);
    } else if (data.code === 'UNAUTHORIZED' || data.message?.toLowerCase().includes('not authenticated')) {
      setCreatedCommunity({ name, description });
      setPage(4);
    } else {
      setError(data.message || 'Failed to create community.');
    }
  };

  const COLOR_SWATCHES = [
    '#ff4500','#ff6534','#ff585b','#ffd635','#46d160',
    '#0dd3bb','#25b79f','#0079d3','#7193ff','#9b59b6',
    '#e74c3c','#f39c12','#1a1a1b','#878a8c','#edeff1',
  ];

  return (
    <div className="ccm-overlay" onClick={onClose}>
      <div className="ccm-modal" onClick={e => e.stopPropagation()}>

        {/* PAGE 1: Topic picker */}
        {page === 1 && (
          <>
            <div className="ccm-body">
              <h1 className="ccm-h1">What will your community be about?</h1>
              <h4 className="ccm-h4">Choose a topic to help redditors discover your community</h4>
              <div className="ccm-topic-grid">
                {COMMUNITY_TOPICS.map(t => (
                  <button
                    key={t.label}
                    type="button"
                    className={`ccm-topic-btn ${selectedTopic === t.label ? 'selected' : ''}`}
                    onClick={() => setSelectedTopic(t.label)}
                  >
                    <span className="ccm-topic-emoji">{t.emoji}</span>
                    <span className="ccm-topic-label">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={onClose}>Cancel</button>
                <button
                  className="ccm-next-btn"
                  disabled={!selectedTopic}
                  onClick={() => setPage(2)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* PAGE 2: Community type */}
        {page === 2 && (
          <>
            <div className="ccm-body">
              <h1 className="ccm-h1">What kind of community is this?</h1>
              <h6 className="ccm-h6">Decide who can view and contribute in your community. Only public communities show up in search. Important: Once set, you will need to submit a request to change your community type.</h6>

              <div className="ccm-type-list">
                {[
                  { value: 'public', label: 'Public', desc: 'Anyone can view, post, and comment to this community' },
                  { value: 'restricted', label: 'Restricted', desc: 'Anyone can view, but only approved users can contribute' },
                  { value: 'private', label: 'Private', desc: 'Only approved users can view and contribute' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ccm-type-btn ${communityType === opt.value ? 'selected' : ''}`}
                    onClick={() => setCommunityType(opt.value)}
                  >
                    <span className={`ccm-type-radio ${communityType === opt.value ? 'checked' : ''}`} />
                    <div className="ccm-type-text">
                      <span className="ccm-type-label">{opt.label}</span>
                      <span className="ccm-type-desc">{opt.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="ccm-mature-row">
                <div className="ccm-mature-text">
                  <span className="ccm-mature-label">Mature (18+)</span>
                  <span className="ccm-mature-desc">Users must be over 18 to view and contribute</span>
                </div>
                <button
                  type="button"
                  className={`fm-toggle ${matureToggle ? 'on' : ''}`}
                  onClick={() => setMatureToggle(p => !p)}
                  aria-label="Toggle mature"
                >
                  <span className="fm-toggle-knob" />
                </button>
              </div>

              <h6 className="ccm-h6 ccm-h6-footer">
                By continuing, you agree to our{' '}
                <a href="#" className="ccm-link">Mod Code of Conduct</a>{' '}and acknowledge that you understand the{' '}
                <a href="#" className="ccm-link">Reddit Rules</a>.
              </h6>
            </div>

            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={() => setPage(1)}>Back</button>
                <button className="ccm-next-btn" onClick={() => setPage(3)}>Next</button>
              </div>
            </div>
          </>
        )}

        {/* PAGE 3: Tell us about your community */}
        {page === 3 && (
          <>
            <div className="ccm-body ccm-body-split">
              <div className="ccm-split-form">
                <h1 className="ccm-h1">Tell us about your community</h1>
                <p className="ccm-para">A name and description help people understand what your community is all about.</p>

                <div className="ccm-field">
                  <div className="ccm-big-input-wrap">
                    <input
                      className="ccm-big-input"
                      placeholder="Community name *"
                      value={name}
                      onChange={e => setName(e.target.value.replace(/\s/g, '').slice(0, 21))}
                      maxLength={21}
                    />
                    <span className="ccm-big-counter">{name.length}/21</span>
                  </div>
                </div>

                <div className="ccm-field">
                  <div className="ccm-big-input-wrap">
                    <textarea
                      className="ccm-big-input ccm-big-textarea"
                      placeholder="Description *"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                    <span className="ccm-big-counter">{description.length}</span>
                  </div>
                </div>

                {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
              </div>

              <div className="ccm-split-preview">
                <div className="ccm-preview-card">
                  <div className="ccm-preview-body">
                    <div className="ccm-preview-icon-ring">
                      <svg width="36" height="36" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="10" fill="#ff4500"/>
                        <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
                      </svg>
                    </div>
                    <div className="ccm-preview-name">r/{name || 'communityname'}</div>
                    <div className="ccm-preview-stats">1 weekly visitor · 1 weekly contributor</div>
                    <div className="ccm-preview-desc">{description || 'Your community description'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ccm-footer">
              <div className="ccm-dots">
                {[1,2,3,4].map(i => (
                  <span key={i} className={`ccm-dot ${page === i ? 'active' : ''}`} />
                ))}
              </div>
              <div className="ccm-footer-btns">
                <button className="ccm-cancel-btn" onClick={() => setPage(2)}>Back</button>
                <button
                  className="ccm-next-btn"
                  disabled={name.trim().length < 3 || description.trim().length === 0 || loading}
                  onClick={handleSubmit}
                >
                  {loading ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* PAGE 4: Success */}
        {page === 4 && (
          <div className="ccm-body ccm-success-body">
            <div className="ccm-success-left">
              <h1 className="ccm-h1">You launched a new community!</h1>
              <h3 className="ccm-h3">Here's what you should know</h3>
              <p className="ccm-para">We've applied some settings to help you get started. You can view and edit them anytime in your mod tools.</p>
              <div className="ccm-action-row">
                <button className="ccm-action-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  Rules
                </button>
                <button className="ccm-action-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                  Welcome guide
                </button>
              </div>
            </div>

            <div className="ccm-success-right">
              <div className="ccm-success-card">
                <div className="ccm-success-banner" style={{ background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}99 100%)` }} />
                <div className="ccm-success-avatar-wrap">
                  <div className="ccm-success-avatar" style={{ background: baseColor }}>
                    <svg width="32" height="32" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="10" fill={baseColor}/>
                      <path d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .18-.93l-2.38-.5a.26.26 0 0 0-.31.2l-.73 3.44a7.14 7.14 0 0 0-3.89 1.23 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .53-1.98zM7.27 11a1 1 0 1 1 1 1 1 1 0 0 1-1-1zm5.58 2.71a3.58 3.58 0 0 1-2.85.71 3.58 3.58 0 0 1-2.85-.71.19.19 0 0 1 .27-.27 3.21 3.21 0 0 0 2.58.56 3.21 3.21 0 0 0 2.58-.56.19.19 0 0 1 .27.27zm-.13-1.71a1 1 0 1 1 1-1 1 1 0 0 1-1 1z" fill="white"/>
                    </svg>
                  </div>
                  <button className="ccm-avatar-edit" title="Edit avatar">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
                <div className="ccm-success-info">
                  <div className="ccm-success-name">r/{name}</div>
                  <div className="ccm-success-stats">1 weekly visitor · 1 weekly contributor</div>
                  <div className="ccm-success-desc">{description}</div>
                </div>
                <div className="ccm-color-row">
                  <div style={{ position: 'relative' }}>
                    <button className="ccm-color-btn" onClick={() => setShowColorPicker(p => !p)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Base Color
                      <span className="ccm-color-swatch" style={{ background: baseColor }} />
                    </button>
                    {showColorPicker && (
                      <div className="ccm-color-palette">
                        {COLOR_SWATCHES.map(c => (
                          <button
                            key={c}
                            className={`ccm-swatch ${baseColor === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => { setBaseColor(c); setShowColorPicker(false); }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button className="ccm-next-btn" style={{ width: '100%', marginTop: 12, borderRadius: 8 }} onClick={onClose}>
                Go To Community Page
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
