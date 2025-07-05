export default {
  metadata: {
    name: 'hello',
    description: 'Say hello to someone',
    examples: [
      'hello world',
      'hello --name Alice'
    ]
  },
  handler: async (context: any) => {
    const name = context.options.name || context.args[0] || 'World';
    console.log(`Hello, ${name}!`);
  }
};