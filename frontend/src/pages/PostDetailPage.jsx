import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getPost, upvotePost, downvotePost } from '../api/posts';
import { getComments, createComment, deleteComment, upvoteComment, downvoteComment } from '../api/comments';
import { getMe } from '../api/auth';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function buildTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c._id] = { ...c, children: [] }; });
  comments.forEach(c => {
    if (c.parent && map[c.parent]) map[c.parent].children.push(map[c._id]);
    else roots.push(map[c._id]);
  });
  return roots;
}

const AVATAR_COLORS = ['#ff4500','#0079d3','#46d160','#9b59b6','#e74c3c','#f39c12','#1abc9c','#e91e8c'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function CommentBox({ value, onChange, onSubmit, onCancel, submitLabel = 'Comment', submitting }) {
  return (
    <div className="ci-box">
      <textarea
        className="ci-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Join the conversation"
      />
      <div className="ci-toolbar">
        <button type="button" className="ci-format-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
          </svg>
          <span>Aa</span>
        </button>
        <div className="ci-toolbar-right">
          <button type="button" className="ci-cancel-btn" onClick={onCancel}>Cancel</button>
          <button
            type="submit"
            className="ci-submit-btn"
            disabled={submitting || !value.trim()}
            onClick={onSubmit}
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentNode({ comment, currentUser, postId, onReload, depth = 0 }) {
  const [upvoted, setUpvoted]   = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  const [score, setScore]       = useState(comment.upvotes - comment.downvotes);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleUpvote = async () => {
    if (!currentUser) return;
    const d = await upvoteComment(comment._id);
    if (d.success) { setScore(d.upvotes - d.downvotes); setUpvoted(v => !v); setDownvoted(false); }
  };
  const handleDownvote = async () => {
    if (!currentUser) return;
    const d = await downvoteComment(comment._id);
    if (d.success) { setScore(d.upvotes - d.downvotes); setDownvoted(v => !v); setUpvoted(false); }
  };
  const handleReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    const d = await createComment({ content: replyText, postId, parentId: comment._id });
    if (d.success) { setReplyText(''); setShowReply(false); onReload(); }
    setSubmitting(false);
  };
  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    const d = await deleteComment(comment._id);
    if (d.success) onReload();
  };

  const isOwn = currentUser?._id === comment.author?._id;
  const name  = comment.author?.username || '?';

  return (
    <div className={depth > 0 ? 'comment-reply' : 'comment-root'}>
      <div className="comment-card">
        {/* Left: avatar + thread line */}
        <div className="comment-left">
          <div className="comment-avatar" style={{ background: avatarColor(name) }}>
            {name[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div className="comment-thread-line" onClick={() => setCollapsed(true)} title="Collapse" />
          )}
        </div>

        {/* Right: content */}
        <div className="comment-right">
          <div className="comment-header">
            <Link to={`/u/${name}`} className="comment-username">u/{name}</Link>
            <span className="comment-dot">•</span>
            <span className="comment-meta">{timeAgo(comment.createdAt)}</span>
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}
              >[+]</button>
            )}
          </div>

          {!collapsed && (
            <>
              <p className="comment-body">{comment.content}</p>
              <div className="comment-actions">
                <div className={`comment-vote-pill${upvoted ? ' cv-up' : downvoted ? ' cv-down' : ''}`}>
                  <button className="cv-btn" onClick={handleUpvote} title="Upvote">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={upvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  </button>
                  <span className="cv-score">{score}</span>
                  <button className="cv-btn" onClick={handleDownvote} title="Downvote">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={downvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                {currentUser && (
                  <button className="comment-action-btn" onClick={() => setShowReply(v => !v)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Reply
                  </button>
                )}

                <button className="comment-action-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </button>

                {isOwn && (
                  <button className="comment-action-btn comment-action-delete" onClick={handleDelete}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    Delete
                  </button>
                )}
              </div>

              {showReply && (
                <div className="comment-reply-box">
                  <CommentBox
                    value={replyText}
                    onChange={setReplyText}
                    onSubmit={handleReply}
                    onCancel={() => { setShowReply(false); setReplyText(''); }}
                    submitLabel="Reply"
                    submitting={submitting}
                  />
                </div>
              )}

              {comment.children?.length > 0 && (
                <div className="comment-replies">
                  {comment.children.map(child => (
                    <CommentNode key={child._id} comment={child} currentUser={currentUser} postId={postId} onReload={onReload} depth={depth + 1} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost]             = useState(null);
  const [commentTree, setCommentTree] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newComment, setNewComment]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [votes, setVotes]             = useState({ up: 0, down: 0 });
  const [vote, setVote]               = useState(0);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
    load();
  }, [id]);

  async function load() {
    const [postData, commentsData] = await Promise.all([getPost(id), getComments(id)]);
    if (postData.success) { setPost(postData.post); setVotes({ up: postData.post.upvotes, down: postData.post.downvotes }); }
    if (commentsData.success) setCommentTree(buildTree(commentsData.comments));
  }

  const handleUpvote = async () => {
    if (!currentUser) return;
    setVote(v => v === 1 ? 0 : 1);
    const d = await upvotePost(id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };
  const handleDownvote = async () => {
    if (!currentUser) return;
    setVote(v => v === -1 ? 0 : -1);
    const d = await downvotePost(id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };
  const handleCommentSubmit = async (e) => {
    e?.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    const d = await createComment({ content: newComment, postId: id });
    if (d.success) { setNewComment(''); load(); }
    setSubmitting(false);
  };

  if (!post) return <Layout><div className="page-loading">Loading…</div></Layout>;

  const score = votes.up - votes.down;

  return (
    <Layout>
      <div className="page-content" style={{ maxWidth: 1200 }}>
        <div className="page-two-col" style={{ alignItems: 'flex-start' }}>

          {/* ── Left: main content ── */}
          <div className="page-main">

            {/* Post card */}
            <div className="post-detail-card">
              <div className="card-meta" style={{ marginBottom: 8 }}>
                <Link to={`/r/${post.community?.name}`} style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'none', fontSize: 12 }}>
                  r/{post.community?.name}
                </Link>
                <span className="post-dot">•</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Posted by{' '}
                  <Link to={`/u/${post.author?.username}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                    u/{post.author?.username}
                  </Link>
                </span>
                <span className="post-dot">•</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{timeAgo(post.createdAt)}</span>
              </div>

              <h1 className="post-detail-title">{post.title}</h1>
              {post.flair && <span className="post-flair">{post.flair}</span>}
              {post.content && <p className="post-detail-body">{post.content}</p>}
              {post.image && <img src={post.image} alt="" className="post-detail-image" />}

              <div className="post-detail-vote-row">
                <div className={`post-pill post-pill-vote ${vote===1?'pill-up':vote===-1?'pill-down':''}`}>
                  <button className="pill-vote-btn" onClick={handleUpvote}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={vote===1?'currentColor':'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <span className="pill-score">{score}</span>
                  <button className="pill-vote-btn" onClick={handleDownvote}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={vote===-1?'currentColor':'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <div className="post-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {post.commentCount} Comments
                </div>
                <div className="post-pill">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share
                </div>
              </div>
            </div>

            {/* Comment form */}
            {currentUser ? (
              <form onSubmit={handleCommentSubmit} className="comment-form-wrap">
                <p className="comment-as-label">
                  Comment as <Link to={`/u/${currentUser.username}`}>u/{currentUser.username}</Link>
                </p>
                <CommentBox
                  value={newComment}
                  onChange={setNewComment}
                  onSubmit={handleCommentSubmit}
                  onCancel={() => setNewComment('')}
                  submitLabel="Comment"
                  submitting={submitting}
                />
              </form>
            ) : (
              <div className="login-to-comment">
                <Link to="/Login">Log in</Link> or <Link to="/Login">sign up</Link> to leave a comment
              </div>
            )}

            {/* Sort bar */}
            {commentTree.length > 0 && (
              <div className="comments-sort-bar">
                <span className="comments-sort-label">Sort by:</span>
                <button className="comments-sort-btn">
                  Best
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div className="comments-search-wrap">
                  <svg className="comments-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input className="comments-search-input" placeholder="Search Comments" />
                </div>
              </div>
            )}

            {/* Comments */}
            {commentTree.length === 0 ? (
              <div className="page-empty">No comments yet. Be the first!</div>
            ) : (
              commentTree.map(comment => (
                <CommentNode key={comment._id} comment={comment} currentUser={currentUser} postId={id} onReload={load} depth={0} />
              ))
            )}
          </div>

          {/* ── Right: community info panel ── */}
          <div className="page-sidebar" style={{ position: 'sticky', top: 'calc(var(--nav-h) + 20px)' }}>
            <div style={{ background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ background: 'var(--orange)', padding: '12px 16px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>r/{post.community?.name}</span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Community rules and info</p>
                <button
                  onClick={() => window.location.href = `/r/${post.community?.name}`}
                  style={{ width: '100%', background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  View Community
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
