import {
  Boxes,
  ClipboardCheck,
  Library,
  MessageSquareCode,
  Radar,
  Rocket,
  Sliders,
  Workflow,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Boxes,
  ClipboardCheck,
  Library,
  MessageSquareCode,
  Radar,
  Rocket,
  Sliders,
  Workflow,
};

export function TrackIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Boxes;
  return <Icon className={className} />;
}
