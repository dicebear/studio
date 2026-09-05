import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyText } from '@/lib/copyText';

/** How long the button says "Copied" before it offers to copy again. */
const CONFIRM_MS = 1500;

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), CONFIRM_MS);

    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
        }
      }}
    >
      {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}
