import type { CommandContext } from '../../../src/types/context.js';

interface ValidatedData {
  name: string;
  age: number;
  active: boolean;
  role: 'admin' | 'user' | 'guest';
}

export default async function manualSchemaCommand(context: CommandContext<ValidatedData>) {
  console.log('🧪 Manual Schema Test Command');
  console.log('============================');

  if (context.validatedData) {
    console.log('✅ Validated Data:');
    console.log(`  Name: ${context.validatedData.name}`);
    console.log(`  Age: ${context.validatedData.age}`);
    console.log(`  Active: ${context.validatedData.active}`);
    console.log(`  Role: ${context.validatedData.role}`);
  } else {
    console.log('❌ No validated data available');
  }

  console.log('\nRaw context:');
  console.log(`  Args: [${context.args.join(', ')}]`);
  console.log(`  Options:`, context.options);
}