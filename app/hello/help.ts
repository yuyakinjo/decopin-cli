import type { CommandHelpMetadata } from '../../dist/types/index.js';

export default function createHelp(): CommandHelpMetadata {
  return {
    name: 'hello',
    description: 'Say hello to someone',
    examples: [
      'hello Alice',
      'hello --name Bob',
      'hello "Alice Smith"'
    ],
    aliases: ['hi', 'greet', "hey"],
    additionalHelp: 'This command greets a person with a friendly hello message.'
  };
}