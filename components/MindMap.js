'use client';

function Node({ node }) {
  if (!node) return null;
  return (
    <div>
      <div className="mindmap-node">{node.title}</div>
      {node.children && node.children.length > 0 && (
        <div className="mindmap-children">
          {node.children.map((child, i) => (
            <Node key={i} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMap({ data }) {
  if (!data) {
    return <p style={{ color: '#6b7280' }}>No mind map for this chapter yet.</p>;
  }
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <Node node={data} />
    </div>
  );
}
