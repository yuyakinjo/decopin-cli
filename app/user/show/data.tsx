import { notFound, type CommandProps } from 'decopin-cli';

const USERS = ['alice', 'bob', 'carol'];

/** notFound() renders the nearest not-found.tsx, suggestion included (ADR 30) */
export default function Data({ args }: CommandProps<'user/show'>) {
  if (!USERS.includes(args.name)) {
    notFound({ what: 'user', requested: args.name, available: USERS });
  }
  return { name: args.name, role: 'member' };
}
