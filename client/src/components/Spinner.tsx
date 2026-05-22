export default function Spinner({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round"
      className="animate-spin"
      role="status" aria-label="Loading"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}
