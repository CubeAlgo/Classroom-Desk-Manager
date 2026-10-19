export const AVATAR_COLORS = ["coral", "sun", "mint", "sky", "grape", "rose"];

export function parseAvatar(avatar?: string) {
  const [color = ""] = (avatar || "").split("|");
  return { color };
}

export function KidAvatar({ avatar, fallback, size = 36, className = "" }: { avatar?: string; fallback: string; size?: number; className?: string }) {
  const { color } = parseAvatar(avatar);
  return (
    <span className={`kid-avatar ${color ? `av-${color}` : ""} ${className}`} style={{ width: size, height: size }}>
      {fallback}
    </span>
  );
}
