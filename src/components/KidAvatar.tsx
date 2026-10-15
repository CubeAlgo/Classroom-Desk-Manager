import { Cat, Dog, Bird, Fish, Rabbit, Turtle, Squirrel, Snail, Bug, PawPrint, type LucideIcon } from "lucide-react";

export const AVATAR_COLORS = ["coral", "sun", "mint", "sky", "grape", "rose"];
export const AVATAR_ANIMALS: Record<string, LucideIcon> = {
  cat: Cat, dog: Dog, bird: Bird, fish: Fish, rabbit: Rabbit, turtle: Turtle, squirrel: Squirrel, snail: Snail, bug: Bug, paw: PawPrint,
};

export function parseAvatar(avatar?: string) {
  const [color = "", animal = ""] = (avatar || "").split("|");
  return { color, animal };
}

export function KidAvatar({ avatar, fallback, size = 36, className = "" }: { avatar?: string; fallback: string; size?: number; className?: string }) {
  const { color, animal } = parseAvatar(avatar);
  const Icon = AVATAR_ANIMALS[animal];
  return (
    <span className={`kid-avatar ${color ? `av-${color}` : ""} ${className}`} style={{ width: size, height: size }}>
      {Icon ? <Icon size={Math.round(size * 0.55)} strokeWidth={2.2} /> : fallback}
    </span>
  );
}
