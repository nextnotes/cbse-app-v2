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

    case 'image':
      return block.imageUrl ? (
        <figure className="notes-image">
          <img src={block.imageUrl} alt={block.caption || ''} loading="lazy" />
          {(block.caption || block.attribution) && (
            <figcaption>
              {block.caption}
              {block.attribution && (
                <span className="notes-image-attribution"> — {block.attribution}</span>
              )}
            </figcaption>
          )}
        </figure>
      ) : null;

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

    case 'formula':
      return (
        <div className="notes-formula">
          {block.title && <div className="notes-formula-title">{block.title}</div>}
          <div className="notes-formula-expression">{block.expression}</div>
          {block.note && <div className="notes-formula-note">{block.note}</div>}
        </div>
      );

    case 'worked_example':
      return (
        <div className="notes-worked-example">
          <div className="notes-worked-title">✏️ Worked Example</div>
          <div className="notes-worked-problem">{block.problem}</div>
          {block.steps?.length > 0 && (
            <ol className="notes-worked-steps">
              {block.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          )}
          {block.answer && (
            <div className="notes-worked-answer">✅ Answer: {block.answer}</div>
          )}
        </div>
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

    case 'quick_facts':
      return (
        <div className="notes-quickfacts">
          <div className="notes-quickfacts-title">📌 Quick Facts — One-Line Summary</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {block.items?.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
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

  // Manually-typed notes are a plain string. But sometimes the AI (or a
  // double-encoding step) hands back a string that actually contains JSON —
  // try to parse it first so it still renders as the styled template instead
  // of showing raw JSON text.
  if (typeof notes === 'string') {
    try {
      notes = JSON.parse(notes);
    } catch {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 15 }}>{notes}</div>;
    }
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
