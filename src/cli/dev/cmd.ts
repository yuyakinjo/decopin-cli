import { watchApp } from '../../core/build/watch.ts';
import { EXIT_CODE } from '../../core/runtime/exit.ts';
import { hasFlag, optionValue, type Usage } from '../argv.ts';

export const usage: Usage = {
  summary: 'watch app/ and keep .decopin/ (types included) up to date',
};

/** dev は Ctrl+C まで終わらないので、Promise は解決しない */
export default function run(argv: string[]): Promise<number> {
  return new Promise((resolvePromise) => {
    const watcher = watchApp({
      appDir: optionValue(argv, '--app'),
      workDir: optionValue(argv, '--work'),
      strictEffects: hasFlag(argv, '--strict-effects'),
      onGenerate: (result) => {
        for (const warning of result.warnings) {
          process.stderr.write(`[decopin] warning: ${warning.message}\n`);
        }
        const names = result.routes.map((route) => route.name || '(root)');
        process.stdout.write(
          `[decopin] ${result.routes.length} command(s): ${names.join(', ')}\n`
        );
      },
      onError: (error) => {
        const message = Error.isError(error) ? error.message : String(error);
        process.stderr.write(`[decopin] ${message}\n`);
      },
    });

    const stop = () => {
      watcher.close();
      resolvePromise(EXIT_CODE.success);
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}
