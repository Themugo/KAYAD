
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#176B87]/90 border border-[#0A3340]/60 rounded-2xl p-5 backdrop-blur-md shadow-lg transition-all duration-300 ${
        hoverable ? 'hover:border-[#13B8A6]/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
