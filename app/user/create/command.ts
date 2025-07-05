export default {
  metadata: {
    name: 'create',
    description: 'Create a new user',
    examples: [
      'user create --name john --email john@example.com',
      'user create john john@example.com'
    ]
  },
  handler: async (context: any) => {
    const name = context.options.name || context.args[0];
    const email = context.options.email || context.args[1];

    if (!name || !email) {
      console.error('Error: Name and email are required');
      context.showHelp();
      return;
    }

    console.log(`Creating user: ${name} (${email})`);
    console.log('✅ User created successfully!');
  }
};