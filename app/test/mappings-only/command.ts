import type { CommandContext } from '../../../dist/types/index.js';

interface MappingsOnlyData {
  name: string;
  age: number;
  active: boolean;
}

export default async function createCommand(context: CommandContext<MappingsOnlyData>) {
  const { name, age, active } = context.validatedData;
  
  console.log('Mappings-only validation test:');
  console.log(`- Name: ${name} (type: ${typeof name})`);
  console.log(`- Age: ${age} (type: ${typeof age})`);
  console.log(`- Active: ${active} (type: ${typeof active})`);
}