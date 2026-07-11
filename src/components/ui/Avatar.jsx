// src/components/ui/Avatar.jsx
export default function Avatar({ src, alt, size = 'md', variant, initials, className = '', style, ...rest }) {
  const classes = ['ui-avatar', `ui-avatar--${size}`, variant ? `ui-avatar--${variant}` : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} style={style} {...rest}>
      {src ? <img src={src} alt={alt || 'Avatar'} /> : initials || '?'}
    </div>
  );
}
