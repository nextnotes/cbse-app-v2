'use client';

function Badge({ children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: 'rgba(255,255,255,0.22)',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: 999,
        marginRight: 6,
        marginTop: 6,
      }}
    >
      {children}
    </span>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return <h3 className="notes-heading">{block.text}</h3>;

    case 'paragraph':
      return <p className="notes-paragraph">{block.text}</p>;

    case 'callout':
      return (
        <div className="notes-callout">
          {block.title && <div className="notes-callout-title">💡 {block.title}</div>}
          <div>{block.text}</div>
        </div>
      );

    case 'timeline':
      return (
        <div className="notes-timeline">
          {block.items?.map((item, i) => (
            <div key={i} className="notes-timeline-item">
              <div className="notes-timeline-date">{item.date}</div>
              <div className="notes-paragraph" style={{ margin: 0 }}>{item.text}</div>
            </div>
          ))}
        </div>
      );

    case 'table':
      return (
        <div style={{ overflowX: 'auto' }}>
          <table className="notes-table">
            <thead>
              <tr>{block.columns?.map((c, i) => <th key={i}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {block.rows?.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'list':
      return (
        <ul className="notes-list">
          {block.items?.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );

    case 'glossary':
      return (
        <div className="notes-glossary">
          {block.items?.map((item, i) => (
            <div key={i} className="notes-glossary-item">
              <div className="notes-glossary-term">{item.term}</div>
              <div>{item.definition}</div>
            </div>
          ))}
        </div>
      );

    case 'recap':
      return (
        <div className="notes-recap">
          <div className="notes-recap-title">✅ Quick Recap</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {block.items?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export default function NotesRenderer({ notes }) {
  if (!notes) return null;

  // Manually-typed notes (or older chapters saved before this update) are a
  // plain string — show them simply, no template.
  if (typeof notes === 'string') {
    return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 15 }}>{notes}</div>;
  }

  return (
    <div className="notes-doc">
      <div className="notes-header">
        <div style={{ fontSize: 21, fontWeight: 800 }}>{notes.title}</div>
        {notes.subtitle && (
          <div style={{ opacity: 0.9, marginTop: 4, fontSize: 14 }}>{notes.subtitle}</div>
        )}
        {notes.badges?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {notes.badges.map((b, i) => <Badge key={i}>{b}</Badge>)}
          </div>
        )}
      </div>
      {notes.blocks?.map((block, i) => <Block key={i} block={block} />)}
    </div>
  );
}
