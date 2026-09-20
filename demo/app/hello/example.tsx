import type { CommandExample } from 'decopin-cli';

export default function Example(): CommandExample[] {
  return [
    { args: [], description: 'Defaults: greets the world.' },
    {
      args: ['decopin', '--loud', '--times', '2'],
      description: 'Shout it twice.',
    },
    {
      args: ['--times', '9'],
      description: 'Out of range, so it explains and stops.',
    },
  ];
}
