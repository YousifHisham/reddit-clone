import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = ['Outfits','Tops','Bottoms','Hair','Face','Eyes','Hats','Right Hand','Left Hand','Backgrounds','Colors'];

// ── Color palettes ───────────────────────────────────────────────────────────
const BODY_COLORS   = ['#ffffff','#f5cba7','#c8a882','#a0785a','#7d5a3c','#f0a500','#e74c3c','#e91e8c','#9b59b6','#7c83d6','#3498db','#1abc9c'];
const EYE_COLORS    = ['#1abc9c','#7c83d6','#c8a882','#a0785a','#f0a500','#e74c3c','#e91e8c','#9b59b6','#3498db','#2ecc71','#e67e22','#16a085'];
const HAIR_COLORS   = ['#c8a882','#f5e6a3','#a0785a','#1a1a1b','#f0a500','#e74c3c','#e91e8c','#9b59b6','#7c83d6','#3498db','#1abc9c','#2ecc71'];
const FACIAL_COLORS = ['#c8a882','#f5e6a3','#a0785a','#1a1a1b','#f0a500','#e74c3c','#e91e8c','#9b59b6','#7c83d6','#3498db','#1abc9c','#2ecc71'];
const BG_COLORS     = ['#ffffff','#f6f7f8','#ffecd2','#d4f1f4','#e8d5f5','#ffd6d6','#d5f5e3','#fef9e7','#1a1a1b','#2c3e50','#1abc9c','#3498db'];

// ── Item grids for non-color tabs ────────────────────────────────────────────
const TOPS_ITEMS = [
  { id:'t1', label:'Basic Tee',     color:'#3498db' },
  { id:'t2', label:'Hoodie',        color:'#e74c3c' },
  { id:'t3', label:'Tank Top',      color:'#2ecc71' },
  { id:'t4', label:'Jacket',        color:'#1a1a1b' },
  { id:'t5', label:'Sweater',       color:'#9b59b6' },
  { id:'t6', label:'Polo',          color:'#f0a500' },
  { id:'t7', label:'Flannel',       color:'#c0392b' },
  { id:'t8', label:'Crop Top',      color:'#e91e8c' },
];
const BOTTOMS_ITEMS = [
  { id:'b1', label:'Jeans',         color:'#2980b9' },
  { id:'b2', label:'Shorts',        color:'#27ae60' },
  { id:'b3', label:'Skirt',         color:'#e91e8c' },
  { id:'b4', label:'Sweatpants',    color:'#7f8c8d' },
  { id:'b5', label:'Cargo Pants',   color:'#6d4c41' },
  { id:'b6', label:'Leggings',      color:'#1a1a1b' },
];
const HAIR_ITEMS = [
  { id:'h1', label:'Short',         color:'#a0785a' },
  { id:'h2', label:'Long',          color:'#1a1a1b' },
  { id:'h3', label:'Curly',         color:'#c8a882' },
  { id:'h4', label:'Bun',           color:'#f0a500' },
  { id:'h5', label:'Mohawk',        color:'#e74c3c' },
  { id:'h6', label:'Afro',          color:'#1a1a1b' },
  { id:'h7', label:'Braids',        color:'#9b59b6' },
  { id:'h8', label:'Ponytail',      color:'#c8a882' },
];
const FACE_ITEMS = [
  { id:'f1', label:'Smile',         color:'#f0a500' },
  { id:'f2', label:'Sunglasses',    color:'#1a1a1b' },
  { id:'f3', label:'Blush',         color:'#e91e8c' },
  { id:'f4', label:'Freckles',      color:'#c8a882' },
  { id:'f5', label:'Beard',         color:'#7d5a3c' },
  { id:'f6', label:'Mustache',      color:'#1a1a1b' },
];
const EYES_ITEMS = [
  { id:'e1', label:'Round',         color:'#3498db' },
  { id:'e2', label:'Almond',        color:'#1abc9c' },
  { id:'e3', label:'Wide',          color:'#9b59b6' },
  { id:'e4', label:'Sleepy',        color:'#7f8c8d' },
  { id:'e5', label:'Wink',          color:'#e74c3c' },
  { id:'e6', label:'Star',          color:'#f0a500' },
];
const HATS_ITEMS = [
  { id:'ha1', label:'Beanie',       color:'#e74c3c' },
  { id:'ha2', label:'Cap',          color:'#3498db' },
  { id:'ha3', label:'Top Hat',      color:'#1a1a1b' },
  { id:'ha4', label:'Crown',        color:'#f0a500' },
  { id:'ha5', label:'Cowboy',       color:'#a0785a' },
  { id:'ha6', label:'Bucket Hat',   color:'#2ecc71' },
];
const RHAND_ITEMS = [
  { id:'rh1', label:'Sword',        color:'#7f8c8d' },
  { id:'rh2', label:'Wand',         color:'#9b59b6' },
  { id:'rh3', label:'Coffee',       color:'#a0785a' },
  { id:'rh4', label:'Phone',        color:'#1a1a1b' },
  { id:'rh5', label:'Flower',       color:'#e91e8c' },
  { id:'rh6', label:'Trophy',       color:'#f0a500' },
];
const LHAND_ITEMS = [
  { id:'lh1', label:'Shield',       color:'#3498db' },
  { id:'lh2', label:'Book',         color:'#c8a882' },
  { id:'lh3', label:'Balloon',      color:'#e74c3c' },
  { id:'lh4', label:'Pizza',        color:'#f0a500' },
  { id:'lh5', label:'Skateboard',   color:'#2ecc71' },
  { id:'lh6', label:'Guitar',       color:'#a0785a' },
];
const OUTFITS_ITEMS = [
  { id:'o1', label:'Casual',        color:'#3498db' },
  { id:'o2', label:'Formal',        color:'#1a1a1b' },
  { id:'o3', label:'Sporty',        color:'#e74c3c' },
  { id:'o4', label:'Streetwear',    color:'#9b59b6' },
  { id:'o5', label:'Fantasy',       color:'#f0a500' },
  { id:'o6', label:'Sci-Fi',        color:'#1abc9c' },
];

// ── Default avatar state ─────────────────────────────────────────────────────
const DEFAULT_STATE = {
  bodyColor: null, eyeColor: null, hairColor: null, facialColor: null, bgColor: null,
  top: null, bottom: null, hair: null, face: null, eye: null,
  hat: null, rhand: null, lhand: null, outfit: null,
};

// ── Rainbow circle ───────────────────────────────────────────────────────────
const RainbowCircle = () => (
  <svg width="44" height="44" viewBox="0 0 44 44">
    <defs>
      <linearGradient id="rbg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#ff0000"/>
        <stop offset="17%"  stopColor="#ff8800"/>
        <stop offset="33%"  stopColor="#ffff00"/>
        <stop offset="50%"  stopColor="#00cc00"/>
        <stop offset="67%"  stopColor="#0000ff"/>
        <stop offset="83%"  stopColor="#8800ff"/>
        <stop offset="100%" stopColor="#ff00ff"/>
      </linearGradient>
    </defs>
    <circle cx="22" cy="22" r="20" fill="url(#rbg)"/>
    <circle cx="22" cy="22" r="8"  fill="white"/>
    <path d="M18 22 L22 18 L26 22" fill="none" stroke="#555" strokeWidth="2"/>
  </svg>
);

// ── Color row ────────────────────────────────────────────────────────────────
function ColorRow({ label, colors, selected, onSelect }) {
  return (
    <div className="ae-color-section">
      <div className="ae-color-label">{label}</div>
      <div className="ae-color-row">
        <button className="ae-color-swatch ae-rainbow" title="Custom color"><RainbowCircle /></button>
        {colors.map((c, i) => (
          <button
            key={i}
            className={`ae-color-swatch ${selected === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => onSelect(c)}
          />
        ))}
        <button className="ae-reset-btn" onClick={() => onSelect(null)}>Reset</button>
      </div>
    </div>
  );
}

// ── Item grid ────────────────────────────────────────────────────────────────
function ItemGrid({ label, items, selected, onSelect }) {
  return (
    <div className="ae-color-section">
      <div className="ae-color-label">{label}</div>
      <div className="ae-item-grid">
        {items.map(item => (
          <button
            key={item.id}
            className={`ae-item-card ${selected === item.id ? 'selected' : ''}`}
            onClick={() => onSelect(selected === item.id ? null : item.id)}
          >
            <div className="ae-item-icon" style={{ background: item.color }}>
              {item.label[0]}
            </div>
            <span className="ae-item-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Item lookup helpers ───────────────────────────────────────────────────────
const ALL_ITEMS = [...TOPS_ITEMS,...BOTTOMS_ITEMS,...HAIR_ITEMS,...FACE_ITEMS,...EYES_ITEMS,...HATS_ITEMS,...RHAND_ITEMS,...LHAND_ITEMS,...OUTFITS_ITEMS];
const itemColor = (id) => ALL_ITEMS.find(i => i.id === id)?.color || '#888';

// ── Snoo SVG preview ─────────────────────────────────────────────────────────
function SnooPreview({ state }) {
  const body = state.bodyColor || '#c8a882';
  const eye  = state.eyeColor  || '#e74c3c';
  const bg   = state.bgColor   || 'transparent';
  const hairC = state.hairColor || '#a0785a';

  // item colors
  const topC    = state.top    ? itemColor(state.top)    : null;
  const bottomC = state.bottom ? itemColor(state.bottom) : null;
  const hairId  = state.hair;
  const hatC    = state.hat    ? itemColor(state.hat)    : null;
  const faceId  = state.face;
  const eyeId   = state.eye;
  const rhandC  = state.rhand  ? itemColor(state.rhand)  : null;
  const lhandC  = state.lhand  ? itemColor(state.lhand)  : null;
  const outfitC = state.outfit ? itemColor(state.outfit) : null;

  // outfit overrides top+bottom
  const shirtC  = outfitC || topC;
  const pantsC  = outfitC || bottomC;

  return (
    <svg width="220" height="280" viewBox="0 0 220 280" fill="none">
      {bg !== 'transparent' && <rect width="220" height="280" fill={bg} rx="12"/>}

      {/* antenna */}
      <line x1="110" y1="30" x2="130" y2="10" stroke={body} strokeWidth="4" strokeLinecap="round"/>
      <circle cx="133" cy="8" r="7" fill={body}/>

      {/* head */}
      <ellipse cx="110" cy="80" rx="55" ry="52" fill={body}/>
      <ellipse cx="58"  cy="68" rx="12" ry="16" fill={body}/>
      <ellipse cx="162" cy="68" rx="12" ry="16" fill={body}/>

      {/* hair */}
      {hairId === 'h1' && <ellipse cx="110" cy="34" rx="50" ry="12" fill={hairC}/>}
      {hairId === 'h2' && <><ellipse cx="110" cy="34" rx="50" ry="12" fill={hairC}/><rect x="60" y="34" width="12" height="55" rx="6" fill={hairC}/><rect x="148" y="34" width="12" height="55" rx="6" fill={hairC}/></>}
      {hairId === 'h3' && <ellipse cx="110" cy="30" rx="54" ry="18" fill={hairC} opacity="0.9"/>}
      {hairId === 'h4' && <ellipse cx="110" cy="28" rx="18" ry="14" fill={hairC}/>}
      {hairId === 'h5' && <rect x="90" y="20" width="40" height="22" rx="4" fill={hairC}/>}
      {hairId === 'h6' && <ellipse cx="110" cy="30" rx="58" ry="22" fill={hairC}/>}
      {hairId === 'h7' && <><rect x="62" y="34" width="10" height="60" rx="5" fill={hairC}/><rect x="148" y="34" width="10" height="60" rx="5" fill={hairC}/></>}
      {hairId === 'h8' && <><ellipse cx="110" cy="34" rx="50" ry="12" fill={hairC}/><ellipse cx="148" cy="50" rx="10" ry="14" fill={hairC}/></>}

      {/* eyes */}
      <circle cx="92"  cy="78" r="14" fill="white"/>
      <circle cx="128" cy="78" r="14" fill="white"/>
      {eyeId === 'e4' ? (
        <><path d="M84 76 Q92 80 100 76" stroke={eye} strokeWidth="3" fill="none"/><path d="M120 76 Q128 80 136 76" stroke={eye} strokeWidth="3" fill="none"/></>
      ) : eyeId === 'e5' ? (
        <><circle cx="95" cy="80" r="8" fill={eye}/><path d="M120 76 Q128 80 136 76" stroke={eye} strokeWidth="3" fill="none"/><circle cx="133" cy="78" r="3" fill="white"/></>
      ) : eyeId === 'e6' ? (
        <><text x="86" y="85" fontSize="16" fill={eye}>★</text><text x="122" y="85" fontSize="16" fill={eye}>★</text></>
      ) : (
        <><circle cx="95"  cy="80" r="8" fill={eye}/><circle cx="131" cy="80" r="8" fill={eye}/><circle cx="97" cy="78" r="3" fill="white"/><circle cx="133" cy="78" r="3" fill="white"/></>
      )}
      <ellipse cx="110" cy="98" rx="6" ry="4" fill={eye}/>

      {/* face accessories */}
      {faceId === 'f1' && <path d="M96 110 Q110 126 124 110" stroke="#f0a500" strokeWidth="3" fill="none" strokeLinecap="round"/>}
      {faceId !== 'f1' && <path d="M96 110 Q110 122 124 110" stroke="#7a5c3a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
      {faceId === 'f2' && <><rect x="80" y="72" width="28" height="14" rx="7" fill="#1a1a1b" opacity="0.85"/><rect x="112" y="72" width="28" height="14" rx="7" fill="#1a1a1b" opacity="0.85"/><line x1="108" y1="79" x2="112" y2="79" stroke="#1a1a1b" strokeWidth="2"/></>}
      {faceId === 'f3' && <><ellipse cx="82" cy="100" rx="8" ry="5" fill="#e91e8c" opacity="0.5"/><ellipse cx="138" cy="100" rx="8" ry="5" fill="#e91e8c" opacity="0.5"/></>}
      {faceId === 'f4' && <><circle cx="90" cy="98" r="2" fill="#c8a882"/><circle cx="100" cy="102" r="2" fill="#c8a882"/><circle cx="120" cy="102" r="2" fill="#c8a882"/><circle cx="130" cy="98" r="2" fill="#c8a882"/></>}
      {faceId === 'f5' && <ellipse cx="110" cy="118" rx="22" ry="10" fill={hairC} opacity="0.8"/>}
      {faceId === 'f6' && <ellipse cx="110" cy="112" rx="14" ry="5" fill={hairC} opacity="0.8"/>}

      {/* body */}
      <ellipse cx="110" cy="185" rx="42" ry="50" fill={body}/>

      {/* shirt / outfit top */}
      {shirtC && <ellipse cx="110" cy="185" rx="42" ry="50" fill={shirtC} opacity="0.85"/>}
      {shirtC && <ellipse cx="110" cy="188" rx="26" ry="32" fill="white" opacity="0.15"/>}
      {!shirtC && <ellipse cx="110" cy="188" rx="26" ry="32" fill="white" opacity="0.35"/>}

      {/* arms */}
      <ellipse cx="62"  cy="175" rx="14" ry="30" fill={shirtC || body} transform="rotate(-15 62 175)"/>
      <ellipse cx="158" cy="175" rx="14" ry="30" fill={shirtC || body} transform="rotate(15 158 175)"/>

      {/* hands / items */}
      {lhandC && <circle cx="48" cy="205" r="10" fill={lhandC}/>}
      {rhandC && <circle cx="172" cy="205" r="10" fill={rhandC}/>}

      {/* legs */}
      <ellipse cx="90"  cy="242" rx="16" ry="22" fill={pantsC || body}/>
      <ellipse cx="130" cy="242" rx="16" ry="22" fill={pantsC || body}/>
      <ellipse cx="86"  cy="262" rx="20" ry="10" fill={pantsC || body}/>
      <ellipse cx="134" cy="262" rx="20" ry="10" fill={pantsC || body}/>

      {/* hat */}
      {hatC && (
        state.hat === 'ha3' ? <><rect x="80" y="18" width="60" height="30" rx="4" fill={hatC}/><rect x="65" y="46" width="90" height="8" rx="4" fill={hatC}/></> :
        state.hat === 'ha4' ? <><polygon points="110,10 90,40 130,40" fill="#f0a500"/><polygon points="110,10 95,38 125,38" fill="#ffd700"/></> :
        state.hat === 'ha5' ? <><ellipse cx="110" cy="38" rx="55" ry="8" fill={hatC}/><ellipse cx="110" cy="30" rx="28" ry="18" fill={hatC}/></> :
        <ellipse cx="110" cy="34" rx="46" ry="16" fill={hatC}/>
      )}
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AvatarEditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Colors');
  const [showHistory, setShowHistory] = useState(false);

  // Live working state (not saved to history until Save)
  const [current, setCurrent] = useState(DEFAULT_STATE);

  // History: only saved snapshots
  const [history, setHistory] = useState([]);
  const [pointer, setPointer] = useState(-1);

  const patch = useCallback((p) => setCurrent(prev => ({ ...prev, ...p })), []);

  const canUndo = pointer > 0;
  const canRedo = pointer < history.length - 1;

  const undo = () => {
    if (canUndo) { setPointer(p => p - 1); setCurrent(history[pointer - 1]); }
  };
  const redo = () => {
    if (canRedo) { setPointer(p => p + 1); setCurrent(history[pointer + 1]); }
  };

  const handleSave = () => {
    const newHistory = history.slice(0, pointer + 1).concat([current]);
    setHistory(newHistory);
    setPointer(newHistory.length - 1);
    localStorage.setItem('savedAvatar', JSON.stringify(current));
    navigate('/home');
  };

  return (
    <div className="ae-page">
      {/* ── Left panel ── */}
      <div className="ae-left">
        <div className="ae-preview">
          <SnooPreview state={current} />
        </div>

        <div className="ae-left-actions">
          {/* Outfits shortcut */}
          <button
            className={`ae-icon-btn ${activeTab === 'Outfits' ? 'active' : ''}`}
            title="Outfits"
            onClick={() => setActiveTab('Outfits')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>

          {/* History */}
          <button
            className={`ae-icon-btn ${showHistory ? 'active' : ''}`}
            title="History"
            onClick={() => setShowHistory(p => !p)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </button>

          <div style={{ flex: 1 }} />

          {/* Undo */}
          <button
            className="ae-icon-btn"
            title="Undo"
            disabled={!canUndo}
            onClick={undo}
            style={{ opacity: canUndo ? 1 : 0.35 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
          </button>

          {/* Redo */}
          <button
            className="ae-icon-btn"
            title="Redo"
            disabled={!canRedo}
            onClick={redo}
            style={{ opacity: canRedo ? 1 : 0.35 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-.49-3.5"/>
            </svg>
          </button>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="ae-history-panel">
            <div className="ae-history-title">History</div>
            {history.length === 0 && <div style={{color:'#888',fontSize:'12px',padding:'8px'}}>No saves yet</div>}
            {history.map((snap, i) => (
              <button
                key={i}
                className={`ae-history-item ${i === pointer ? 'active' : ''}`}
                onClick={() => { setPointer(i); setCurrent(history[i]); }}
              >
                <div className="ae-history-thumb">
                  <svg width="32" height="40" viewBox="0 0 220 280" fill="none">
                    <ellipse cx="110" cy="80" rx="55" ry="52" fill={snap.bodyColor || '#c8a882'}/>
                    <circle cx="95"  cy="80" r="8" fill={snap.eyeColor || '#e74c3c'}/>
                    <circle cx="131" cy="80" r="8" fill={snap.eyeColor || '#e74c3c'}/>
                    <ellipse cx="110" cy="185" rx="42" ry="50" fill={snap.bodyColor || '#c8a882'}/>
                  </svg>
                </div>
                <span className="ae-history-label">Save {i + 1}</span>
              </button>
            ))}
          </div>
        )}

        <button className="ae-save-btn" onClick={handleSave}>Save</button>
      </div>

      {/* ── Right panel ── */}
      <div className="ae-right">
        <div className="ae-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={`ae-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="ae-content">
          {activeTab === 'Colors' && (
            <>
              <ColorRow label="Body"        colors={BODY_COLORS}   selected={current.bodyColor}   onSelect={c => patch({ bodyColor: c })} />
              <ColorRow label="Eyes"        colors={EYE_COLORS}    selected={current.eyeColor}    onSelect={c => patch({ eyeColor: c })} />
              <ColorRow label="Hair"        colors={HAIR_COLORS}   selected={current.hairColor}   onSelect={c => patch({ hairColor: c })} />
              <ColorRow label="Facial Hair" colors={FACIAL_COLORS} selected={current.facialColor} onSelect={c => patch({ facialColor: c })} />
            </>
          )}
          {activeTab === 'Backgrounds' && (
            <ColorRow label="Background" colors={BG_COLORS} selected={current.bgColor} onSelect={c => patch({ bgColor: c })} />
          )}
          {activeTab === 'Outfits' && (
            <ItemGrid label="Outfits"     items={OUTFITS_ITEMS} selected={current.outfit} onSelect={v => patch({ outfit: v })} />
          )}
          {activeTab === 'Tops' && (
            <ItemGrid label="Tops"        items={TOPS_ITEMS}    selected={current.top}    onSelect={v => patch({ top: v })} />
          )}
          {activeTab === 'Bottoms' && (
            <ItemGrid label="Bottoms"     items={BOTTOMS_ITEMS} selected={current.bottom} onSelect={v => patch({ bottom: v })} />
          )}
          {activeTab === 'Hair' && (
            <ItemGrid label="Hair Styles" items={HAIR_ITEMS}    selected={current.hair}   onSelect={v => patch({ hair: v })} />
          )}
          {activeTab === 'Face' && (
            <ItemGrid label="Face"        items={FACE_ITEMS}    selected={current.face}   onSelect={v => patch({ face: v })} />
          )}
          {activeTab === 'Eyes' && (
            <ItemGrid label="Eye Styles"  items={EYES_ITEMS}    selected={current.eye}    onSelect={v => patch({ eye: v })} />
          )}
          {activeTab === 'Hats' && (
            <ItemGrid label="Hats"        items={HATS_ITEMS}    selected={current.hat}    onSelect={v => patch({ hat: v })} />
          )}
          {activeTab === 'Right Hand' && (
            <ItemGrid label="Right Hand"  items={RHAND_ITEMS}   selected={current.rhand}  onSelect={v => patch({ rhand: v })} />
          )}
          {activeTab === 'Left Hand' && (
            <ItemGrid label="Left Hand"   items={LHAND_ITEMS}   selected={current.lhand}  onSelect={v => patch({ lhand: v })} />
          )}
        </div>
      </div>
    </div>
  );
}
