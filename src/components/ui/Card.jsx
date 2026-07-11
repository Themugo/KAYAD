// src/components/ui/Card.jsx
export default function Card({
  children,
  hover = false,
  flat = false,
  gradient = false,
  header,
  title,
  footer,
  body,
  className = '',
  style,
  onClick,
  ...rest
}) {
  const classes = [
    'ui-card',
    hover ? 'ui-card--hover' : '',
    flat ? 'ui-card--flat' : '',
    gradient ? 'ui-card--gradient' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} onClick={onClick} {...rest}>
      {(header || title) && (
        <div className="ui-card__header">
          {title && <h3 className="ui-card__title">{title}</h3>}
          {header}
        </div>
      )}
      {body !== undefined ? <div className="ui-card__body">{body}</div> : children}
      {footer && <div className="ui-card__footer">{footer}</div>}
    </div>
  );
}
