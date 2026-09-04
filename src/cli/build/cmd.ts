import { relative } from 'node:path';

import { build } from '../../core/build/index.ts';
import { EXIT_CODE } from '../../core/runtime/exit.ts';
import { hasFlag, optionValue, type Usage } from '../argv.ts';

export const usage: Usage = {
  summary: 'scan app/ and produce dist/index.js',
};

export default function run(argv: string[]): Promise<number> {
  const started = performance.now();
  return build({
    appDir: optionValue(argv, '--app'),
    outDir: optionValue(argv, '--out'),
    workDir: optionValue(argv, '--work'),
    minify: hasFlag(argv, '--minify'),
    strictEffects: hasFlag(argv, '--strict-effects'),
  }).then((result) => {
    const elapsed = Math.round(performance.now() - started);
    for (const warning of result.warnings) {
      process.stderr.write(`[decopin] warning: ${warning.message}\n`);
      if (warning.hint !== undefined) {
        process.stderr.write(`[decopin]   ${warning.hint}\n`);
      }
    }
    const names = result.routes.map((route) => route.name || '(root)');
    // 副作用は「無いことの証明」が価値なので、あるものだけ挙げる (ADR 32)。
    // 見つけたものには入口からの経路を添える。「なぜ届くのか」が分からないと
    // 直せないので
    const here = process.cwd();
    const trail = (path: string[], end: string) =>
      [...path.map((file) => relative(here, file)), end].join(' -> ');
    const notable = [...result.effects].flatMap(([name, report]) => {
      const listed = Object.entries(report.effects)
        .filter(([, verdict]) => verdict !== 'none')
        .map(([category, verdict]) =>
          verdict === 'unknown' ? `${category}?` : category
        );
      if (listed.length === 0) return [];
      const routes = Object.keys(report.effects).flatMap((category) => {
        const site = report.sites.find((s) => s.category === category);
        return site === undefined
          ? []
          : [`    ${category}: ${trail(site.path, site.via)}`];
      });
      const gaveUp = report.escapes
        .slice(0, 1)
        .map((escape) => `    ?: ${trail(escape.path, escape.via)}`);
      return [
        `  ${name || '(root)'}: ${listed.join(', ')}`,
        ...routes,
        ...gaveUp,
      ];
    });
    const effectsBlock =
      notable.length === 0
        ? 'No effects reachable from any command\n'
        : `Effects reachable (? = analysis gave up):\n${notable.join('\n')}\n`;

    process.stdout.write(
      `Found ${result.routes.length} command(s): ${names.join(', ')}\n` +
        effectsBlock +
        `Wrote ${result.files.types}\n` +
        `Wrote ${result.completionPath} (zsh completion)\n` +
        `Wrote ${result.outPath} (${(result.bytes / 1024).toFixed(1)} KB) in ${elapsed}ms\n`
    );
    return EXIT_CODE.success;
  });
}
