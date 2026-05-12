interface BanterLoaderProps {
  label?: string;
}

export default function BanterLoader({ label }: BanterLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="banter-loader">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="banter-loader__box" />
        ))}
      </div>
      {label && (
        <p className="text-sm font-body font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
      )}
    </div>
  );
}
