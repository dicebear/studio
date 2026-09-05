import { Progress } from '@/components/ui/progress';
import { Spinner } from './Spinner';

type Props = {
  message?: string;
  fraction?: number | null;
};

export function LoadingState({ message, fraction = null }: Props) {
  return (
    <div className="m-auto flex flex-col items-center p-10 text-center">
      {fraction !== null ? (
        <Progress className="mb-6 h-1.5 w-60 [&>div]:transition-none" value={Math.round(fraction * 100)} />
      ) : (
        <Spinner className="mb-6 size-6" />
      )}
      <p className="mb-1.5 font-semibold">Processing</p>
      <p className="max-w-[360px] text-muted-foreground">
        {message ||
          'This can take a while on large files. Please do not change the file until the process is complete.'}
      </p>
    </div>
  );
}
