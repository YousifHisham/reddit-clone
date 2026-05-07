import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getCommunities, joinCommunity, leaveCommunity } from '../api/communities';
import { getMe } from '../api/auth';

const CATEGORIES = [
  'All', 'Gaming', 'Arts', 'Music', 'Science', 'Technology',
  'Sports', 'Entertainment', 'Food', 'News', 'Education',
  'Health', 'Humor', 'Fashion', 'Travel', 'Finance', 'General',
];

const CATEGORY_ICONS = {
  All: '🌐', Gaming: '🎮', Arts: '🎨', Music: '🎵', Science: '🔬',
  Technology: '💻', Sports: '⚽', Entertainment: '🎬', Food: '🍕',
  News: '📰', Education: '📚', Health: '❤️', Humor: '😂',
  Fashion: '👗', Travel: '✈️', Finance: '💰', General: '💬',
};

const COMMUNITY_COLORS = ['#ff4500', '#0079d3', '#46d160', '#9b59b6', '#e74c3c', '#f39c12'];

function CommunityCard({ community, currentUser, memberIds, onJoinToggle }) {
  const navigate = useNavigate();
  const isMember = memberIds.has(community._id);
  const [loading, setLoading] = useState(false);
  const colorIdx = (community.name?.charCodeAt(0) || 0) % COMMUNITY_COLORS.length;

  const handleJoin = async e => {
    e.stopPropagation();
    if (!currentUser) { navigate('/Login'); return; }
    setLoading(true);
    if (isMember) {
      const d = await leaveCommunity(community._id);
      if (d.success) onJoinToggle(community._id, false);
    } else {
      const d = await joinCommunity(community._id);
      if (d.success) onJoinToggle(community._id, true);
    }
    setLoading(false);
  };

  return (
    <div className="explore-card" onClick={() => navigate(`/r/${community.name}`)}>
      <div className="explore-card-top">
        <div className="explore-card-avatar" style={
          community.icon
            ? { backgroundImage: `url(${community.icon})`, backgroundSize: 'cover' }
            : { background: COMMUNITY_COLORS[colorIdx] }
        }>
          {!community.icon && community.name[0].toUpperCase()}
        </div>
        <div className="explore-card-info">
          <span className="explore-card-name">r/{community.name}</span>
          <span className="explore-card-members">
            {(community.memberCount || 0).toLocaleString()} {community.memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        <button
          className={`join-btn ${isMember ? 'joined' : 'not-joined'}`}
          style={{ padding: '4px 16px', fontSize: 13 }}
          onClick={handleJoin}
          disabled={loading}
        >
          {isMember ? 'Joined' : 'Join'}
        </button>
      </div>
      {community.description && (
        <p className="explore-card-desc">{community.description}</p>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [category, setCategory] = useState('All');
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [memberIds, setMemberIds] = useState(new Set());

  useEffect(() => {
    getMe().then(d => {
      if (d.success) {
        setCurrentUser(d.user);
        fetch('/api/communities?joined=true', {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        })
          .then(r => r.json())
          .then(d => { if (d.success) setMemberIds(new Set(d.communities.map(c => c._id))); });
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    getCommunities(category).then(d => {
      if (d.success) setCommunities(d.communities);
      setLoading(false);
    });
  }, [category]);

  const handleJoinToggle = (id, joined) => {
    setMemberIds(prev => {
      const s = new Set(prev);
      joined ? s.add(id) : s.delete(id);
      return s;
    });
    setCommunities(prev =>
      prev.map(c => c._id === id ? { ...c, memberCount: c.memberCount + (joined ? 1 : -1) } : c)
    );
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 20px' }}>Explore Communities</h1>

        {/* Category pills */}
        <div className="explore-pills">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`explore-pill${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="page-loading">Loading…</div>
        ) : communities.length === 0 ? (
          <div className="page-empty">No communities found{category !== 'All' ? ` in ${category}` : ''}.</div>
        ) : (
          <div className="explore-grid">
            {communities.map(c => (
              <CommunityCard
                key={c._id}
                community={c}
                currentUser={currentUser}
                memberIds={memberIds}
                onJoinToggle={handleJoinToggle}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
