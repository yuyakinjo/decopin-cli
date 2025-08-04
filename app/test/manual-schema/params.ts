import type { ParamsHandler, ParamsContext } from '../../../dist/types/index.js';

export default function createParams(context: ParamsContext<typeof process.env>): ParamsHandler {
  return {
    schema: {
      name: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 100,
      },
      age: {
        type: 'number',
        required: false,
        minValue: 0,
        maxValue: 120,
        defaultValue: 20,
      },
      active: {
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      role: {
        type: 'string',
        required: false,
        enum: ['admin', 'user', 'guest'],
        defaultValue: 'user',
      },
    },
  };
}