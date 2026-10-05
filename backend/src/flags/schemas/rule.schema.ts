import { z } from 'zod';

const conditionOperatorSchema = z.enum([
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'endsWith',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'exists',
]);

type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

type ConditionTree =
  | {
      attr: string;
      operator: z.infer<typeof conditionOperatorSchema>;
      value?: JsonValue;
    }
  | {
      op: 'AND' | 'OR' | 'NOT';
      children: ConditionTree[];
    };

const conditionTreeSchema: z.ZodType<ConditionTree> = z.lazy(() =>
  z.union([
    z.object({
      attr: z.string().min(1),
      operator: conditionOperatorSchema,
      value: jsonValueSchema.optional(),
    }),

    z.object({
      op: z.enum(['AND', 'OR', 'NOT']),
      children: z.array(conditionTreeSchema).min(1),
    }),
  ]),
);

export const ruleSchema = z.object({
  serve: z.boolean(),
  when: conditionTreeSchema,
});

export const rulesSchema = z.array(ruleSchema);

export type Rule = z.infer<typeof ruleSchema>;
export type Rules = z.infer<typeof rulesSchema>;
