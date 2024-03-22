import { CommandProperties } from '.';

export function isMessageCommandProperties<M extends 'slash' | 'message'>(
  properties: CommandProperties<M>
): properties is CommandProperties<'message'> {
  return 'name' in properties;
}
