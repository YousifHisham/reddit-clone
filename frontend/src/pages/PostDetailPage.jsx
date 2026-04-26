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

function CommentNode({ comment, currentUser, postId, onReload, depth = 0 }) {
  const [votes, setVotes] = useState({ up: comment.upvotes, down: comment.downvotes });
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpvote = async () => {
    if (!currentUser) return;
    const d = await upvoteComment(comment._id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };

  const handleDownvote = async () => {
    if (!currentUser) return;
    const d = await downvoteComment(comment._id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };

  const handleReply = async (e) => {
    e.preventDefault();
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

  return (
    <div className="comment-node">
      <div className={depth > 0 ? 'comment-indent' : ''}>
        <div className="comment-card">
          <div className="comment-header">
            <Link to={`/u/${comment.author?.username}`} className="comment-author">
              u/{comment.author?.username}
            </Link>
            <span className="comment-karma">{comment.author?.commentKarma ?? 0} karma</span>
            <span>•</span>
            <span>{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="comment-body">{comment.content}</p>
          <div className="comment-actions">
            <button className="comment-action-btn" onClick={handleUpvote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
              {votes.up}
            </button>
            <button className="comment-action-btn" onClick={handleDownvote}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {votes.down}
            </button>
            {currentUser && (
              <button className="comment-action-btn" onClick={() => setShowReply(v => !v)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Reply
              </button>
            )}
            {isOwn && (
              <button className="comment-action-btn delete" onClick={handleDelete}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
                Delete
              </button>
            )}
          </div>
          {showReply && (
            <div className="comment-reply-form">
              <textarea
                className="comment-textarea"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="What are your thoughts?"
                rows={3}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  className="comment-submit-btn"
                  onClick={handleReply}
                  disabled={submitting || !replyText.trim()}
                  style={{ padding: '4px 16px', fontSize: 12 }}
                >
                  {submitting ? 'Saving…' : 'Reply'}
                </button>
                <button
                  className="post-edit-cancel"
                  onClick={() => { setShowReply(false); setReplyText(''); }}
                  style={{ fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {comment.children?.map(child => (
          <CommentNode
            key={child._id}
            comment={child}
            currentUser={currentUser}
            postId={postId}
            onReload={onReload}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [commentTree, setCommentTree] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [vote, setVote] = useState(0);

  useEffect(() => {
    getMe().then(d => { if (d.success) setCurrentUser(d.user); });
    load();
  }, [id]);

  async function load() {
    const [postData, commentsData] = await Promise.all([getPost(id), getComments(id)]);
    if (postData.success) {
      setPost(postData.post);
      setVotes({ up: postData.post.upvotes, down: postData.post.downvotes });
    }
    if (commentsData.success) setCommentTree(buildTree(commentsData.comments));
  }

  const handleUpvote = async () => {
    if (!currentUser) return;
    const newVote = vote === 1 ? 0 : 1;
    setVote(newVote);
    const d = await upvotePost(id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };

  const handleDownvote = async () => {
    if (!currentUser) return;
    const newVote = vote === -1 ? 0 : -1;
    setVote(newVote);
    const d = await downvotePost(id);
    if (d.success) setVotes({ up: d.upvotes, down: d.downvotes });
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
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
      <div className="page-content-narrow">
        {/* Post */}
        <div className="post-detail-card">
          <div className="card-meta" style={{ marginBottom: 8 }}>
            <Link to={`/r/${post.community?.name}`} className="community-link" style={{ color: 'var(--text)', fontWeight: 700, textDecoration: 'none', fontSize: 12 }}>
              r/{post.community?.name}
            </Link>
            <span className="post-dot">•</span>
            <span>Posted by{' '}
              <Link to={`/u/${post.author?.username}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                u/{post.author?.username}
              </Link>
            </span>
            <span className="post-dot">•</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
          <h1 className="post-detail-title">{post.title}</h1>
          {post.flair && (
            <span className="post-flair">{post.flair}</span>
          )}
          {post.content && <p className="post-detail-body">{post.content}</p>}
          {post.image && <img src={post.image} alt="" className="post-detail-image" />}
          <div className="post-detail-vote-row">
            <div className="vote-row">
              <button
                className={`vote-btn ${vote === 1 ? 'up-active' : ''}`}
                onClick={handleUpvote}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={vote === 1 ? '#ff4500' : 'none'} stroke={vote === 1 ? '#ff4500' : 'currentColor'} strokeWidth="2">
                  <polyline points="18 15 12 9 6 15"/>
                </svg>
              </button>
              <span className={`vote-row-score ${vote === 1 ? 'up' : vote === -1 ? 'down' : ''}`}
                style={{ color: vote === 1 ? 'var(--orange)' : vote === -1 ? '#7193ff' : 'var(--text)' }}>
                {score}
              </span>
              <button
                className={`vote-btn ${vote === -1 ? 'down-active' : ''}`}
                onClick={handleDownvote}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={vote === -1 ? '#7193ff' : 'none'} stroke={vote === -1 ? '#7193ff' : 'currentColor'} strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
            <button className="post-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {post.commentCount} Comments
            </button>
            <button className="post-action-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
          </div>
        </div>

        {/* Comment form */}
        {currentUser ? (
          <form onSubmit={handleCommentSubmit} className="comment-form-card">
            <p className="comment-form-label">
              Comment as{' '}
              <Link to={`/u/${currentUser.username}`}>u/{currentUser.username}</Link>
            </p>
            <textarea
              className="comment-textarea"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="What are your thoughts?"
              rows={4}
            />
            <button
              type="submit"
              className="comment-submit-btn"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? 'Saving…' : 'Comment'}
            </button>
          </form>
        ) : (
          <div className="login-to-comment">
            <Link to="/Login">Log in</Link> or <Link to="/Login">sign up</Link> to leave a comment
          </div>
        )}

        {/* Comments */}
        {commentTree.length === 0 ? (
          <div className="page-empty">No comments yet. Be the first!</div>
        ) : (
          commentTree.map(comment => (
            <CommentNode
              key={comment._id}
              comment={comment}
              currentUser={currentUser}
              postId={id}
              onReload={load}
              depth={0}
            />
          ))
        )}
      </div>
    </Layout>
  );
}
