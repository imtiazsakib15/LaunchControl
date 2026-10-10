import type { Rule } from '../flags/schemas/rule.schema.js';

type Condition = Rule['when'];

type LeafCondition = Extract<
  Condition,
  {
    attr: string;
  }
>;

type GroupCondition = Extract<
  Condition,
  {
    op: 'AND' | 'OR' | 'NOT';
  }
>;

export function evaluateCondition(
  condition: Condition,
  attributes: Record<string, unknown>,
): boolean {
  if ('attr' in condition) {
    return evaluateLeafCondition(condition, attributes);
  }

  return evaluateGroupCondition(condition, attributes);
}

function evaluateLeafCondition(
  condition: LeafCondition,
  attributes: Record<string, unknown>,
): boolean {
  const exists = Object.prototype.hasOwnProperty.call(
    attributes,
    condition.attr,
  );

  if (condition.operator === 'exists') {
    return exists;
  }

  if (!exists) {
    return false;
  }

  const actualValue = attributes[condition.attr];

  switch (condition.operator) {
    case 'equals':
      return actualValue === condition.value;

    case 'notEquals':
      return actualValue !== condition.value;

    case 'contains':
      return contains(actualValue, condition.value);

    case 'startsWith':
      return (
        typeof actualValue === 'string' &&
        typeof condition.value === 'string' &&
        actualValue.startsWith(condition.value)
      );

    case 'endsWith':
      return (
        typeof actualValue === 'string' &&
        typeof condition.value === 'string' &&
        actualValue.endsWith(condition.value)
      );

    case 'gt':
      return compare(actualValue, condition.value, (a, b) => a > b);

    case 'gte':
      return compare(actualValue, condition.value, (a, b) => a >= b);

    case 'lt':
      return compare(actualValue, condition.value, (a, b) => a < b);

    case 'lte':
      return compare(actualValue, condition.value, (a, b) => a <= b);

    case 'in':
      return (
        Array.isArray(condition.value) &&
        condition.value.some((value) => value === actualValue)
      );

    case 'notIn':
      return (
        Array.isArray(condition.value) &&
        !condition.value.some((value) => value === actualValue)
      );
  }
}

function contains(actualValue: unknown, expectedValue: unknown): boolean {
  if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
    return actualValue.includes(expectedValue);
  }

  if (Array.isArray(actualValue)) {
    return actualValue.some((value) => value === expectedValue);
  }

  return false;
}

function compare(
  actualValue: unknown,
  expectedValue: unknown,
  comparator: (a: string | number, b: string | number) => boolean,
): boolean {
  if (typeof actualValue !== 'number' && typeof actualValue !== 'string') {
    return false;
  }

  if (typeof expectedValue !== 'number' && typeof expectedValue !== 'string') {
    return false;
  }

  if (typeof actualValue !== typeof expectedValue) {
    return false;
  }

  return comparator(actualValue, expectedValue);
}

function evaluateGroupCondition(
  condition: GroupCondition,
  attributes: Record<string, unknown>,
): boolean {
  switch (condition.op) {
    case 'AND':
      return condition.children.every((child) =>
        evaluateCondition(child, attributes),
      );

    case 'OR':
      return condition.children.some((child) =>
        evaluateCondition(child, attributes),
      );

    case 'NOT':
      return !condition.children.every((child) =>
        evaluateCondition(child, attributes),
      );
  }
}
