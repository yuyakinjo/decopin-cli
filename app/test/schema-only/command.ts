import type { CommandContext } from '../../../dist/types/index.js';
import type { UserData } from './params.js';

export default async function createCommand(context: CommandContext<UserData>) {
  const { arg0: email, arg1: password, role } = context.validatedData;
  
  console.log('Schema-only validation test:');
  console.log(`- Email: ${email}`);
  console.log(`- Password: ${'*'.repeat(password.length)}`);
  console.log(`- Role: ${role}`);
  console.log('✅ All validations passed!');
}