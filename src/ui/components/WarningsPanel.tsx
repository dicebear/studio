import { Button } from '@/components/ui/button';

export type WarningSection = {
  title: string;
  items: string[];
  onDismiss: () => void;
};

/** The collapsible strips above the footer that list what a task had to skip. */
export function WarningsPanel({ sections }: { sections: WarningSection[] }) {
  const visible = sections.filter((section) => section.items.length > 0);

  if (visible.length === 0) {
    return null;
  }

  return (
    <>
      {visible.map((section) => (
        <div key={section.title} className="border-t bg-muted px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <strong>
              {section.title} ({section.items.length})
            </strong>
            <Button variant="ghost" size="xs" onClick={section.onDismiss}>
              Dismiss
            </Button>
          </div>
          <ul className="mt-1 max-h-24 list-disc overflow-y-auto pl-4 text-muted-foreground">
            {section.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
