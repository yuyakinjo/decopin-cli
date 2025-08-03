import type { CommandContext } from '../../../dist/types/index.js';

interface MappingsWithSchemaData {
  email: string;
  password: string;
}

export default async function createCommand(context: CommandContext<MappingsWithSchemaData>) {
  const { email, password } = context.validatedData;
  
  console.log('Mappings + Schema validation test:');
  console.log(`- Email: ${email}`);
  console.log(`- Password: ${'*'.repeat(password.length)}`);
  console.log('✅ All validations passed!');
}