import * as v from 'valibot';
import type { ParamsHandler } from '../../../dist/types/index.js';

const ListSchema = v.object({
  limit: v.pipe(
    v.union([v.string(), v.number()]),
    v.transform((val) => Number(val)),
    v.number(),
    v.minValue(1, 'Limit must be at least 1'),
    v.maxValue(100, 'Limit cannot exceed 100')
  ),
});

export type ListData = v.InferOutput<typeof ListSchema>;

export default function createParams(): ParamsHandler {
  return {
    schema: ListSchema,
    mappings: [
      {
        field: 'limit',
        option: 'limit',
        defaultValue: 10,
      },
    ],
  };
}