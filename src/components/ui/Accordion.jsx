// src/components/ui/Accordion.jsx
import { useState } from 'react';

export default function Accordion({ items = [], defaultOpen = -1, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`ui-accordion ${className}`}>
      {items.map((item, i) => (
        <div key={i} className={`ui-accordion__item ${open === i ? 'ui-accordion__item--open' : ''}`}>
          <button
            className="ui-accordion__header"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
          >
            <span>{item.q || item.title || item.label}</span>
            <span className="ui-accordion__icon">+</span>
          </button>
          {open === i && (
            <div className="ui-accordion__body">
              {item.a || item.content || item.desc}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
