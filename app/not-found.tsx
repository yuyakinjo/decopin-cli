import { Danger, DidYouMean, type NotFoundProps } from 'decopin-cli';

/**
 * Serves both cases: an unknown command, and `notFound()` from a command
 * (ADR 30). `what` tells them apart — a command is worth prefixing with the
 * program name, a user name is not.
 */
export default function NotFound({
  what,
  requested,
  suggestion,
  available,
  program,
}: NotFoundProps) {
  const isCommand = what === 'command';
  return (
    <>
      <Danger>
        no such {what}: {requested}
      </Danger>
      <DidYouMean
        requested={requested}
        from={
          isCommand ? available.map((name) => `${program} ${name}`) : available
        }
        suggestion={
          suggestion === undefined || !isCommand
            ? suggestion
            : `${program} ${suggestion}`
        }
        label={isCommand ? 'available commands' : `available ${what}s`}
      />
    </>
  );
}
