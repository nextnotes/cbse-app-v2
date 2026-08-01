'use client';

// Each top-level branch gets its own color; everything under that branch
// stays visually grouped with it (filled pill for the branch itself, colored
// outline pills for its descendants) so the map is colorful but still scannable.
const PALETTE = ['#5b7fdb', '#35b7a3', '#ff8a3d', '#ff6f91', '#7b6ee0', '#2f9fd8', '#e8b93a', '#4fc3a1'];

function Node({ node, depth = 0, color }) {
  if (!node) return null;
  const isRoot = depth === 0;
  const isBranch = depth === 1;

  const style = isRoot
    ? {
        background: 'linear-gradient(135deg, #5b7fdb, #35b7a3)',
        color: '#fff',
        border: 'none',
        fontSize: 15,
        padding: '10px 18px',
      }
    : isBranch
    ? { background: color, color: '#fff', border: 'none' }
    : { background: '#fff', color, border: `1.5px solid ${color}` };

  return (
    <div>
      <div className="mindmap-node" style={style}>
        {node.title}
      </div>
      {node.children?.length > 0 && (
        <div className="mindmap-children" style={{ borderLeftColor: isRoot ? '#c7d2ee' : color }}>
          {node.children.map((child, i) => (
            <Node key={i} node={child} depth={depth + 1} color={isRoot ? PALETTE[i % PALETTE.length] : color} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMap({ data }) {
  // Same defensive parse as NotesRenderer/PracticeSet — handles the case
  // where this arrives as a JSON string instead of an already-parsed object.
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  if (!data) {
    return <p style={{ color: '#6b7280' }}>No mind map for this chapter yet.</p>;
  }
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <Node node={data} />
    </div>
  );
}
