import { Code } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

export function InspectEmptyState() {
  return (
    <EmptyState
      className="max-w-[400px]"
      icon={<Code className="mx-auto size-8 text-icon-secondary" strokeWidth={1.5} />}
      title="Select an avatar"
    >
      <p className="text-muted-foreground [text-wrap:pretty]">
        Pick a layer the Generate tab filled or inserted. Inspect shows its seed and options, with the API URL and the
        code a developer needs to render the same avatar. A frame or group works too, every avatar inside it is listed.
      </p>
    </EmptyState>
  );
}
