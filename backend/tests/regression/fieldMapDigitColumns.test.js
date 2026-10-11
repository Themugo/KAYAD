import { camelToSnake, snakeToCamel, FIELD_ALIASES } from '../../utils/fieldMap.js';

// D-DATA-1: columns whose snake_case segment starts with a digit do not survive snake->camel->snake without an alias.
const roundTrip = (table, col) => {
  const camel = snakeToCamel(col);
  return (FIELD_ALIASES[table] || {})[camel] || camelToSnake(camel);
};

describe('fieldMap digit-segment columns round-trip', () => {
  test.each([
    ['cars', 'reminder_sent_5min'], ['cars', 'reminder_sent_15min'], ['cars', 'reminder_sent_30min'], ['cars', 'reminder_sent_60min'],
    ['vehicle_valuations', 'future_value_12m'], ['vehicle_valuations', 'future_value_24m'],
  ])('%s.%s maps back to the real column', (table, col) => {
    expect(roundTrip(table, col)).toBe(col);
  });
  test('the unaliased default really is lossy (guards the reason the alias exists)', () => {
    expect(camelToSnake(snakeToCamel('reminder_sent_5min'))).toBe('reminder_sent5min');
  });
});
