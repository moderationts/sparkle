import { PermissionFlagsBits, Message } from 'discord.js';
import ms from 'ms';
import Command, { properties } from '../../lib/structs/Command';

@properties<'message'>({
  name: 'slowmode',
  description: 'Modify the slowmode in a channel.',
  args: ['[slowmode]'],
  aliases: ['sm'],
  clientPermissions: PermissionFlagsBits.ManageChannels,
  userPermissions: PermissionFlagsBits.ManageMessages
})
class SlowmodeCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0)
      return message.channel.send(
        `The current slowmode is ${
          message.channel.rateLimitPerUser
            ? `${ms(message.channel.rateLimitPerUser * 1000, { long: true }).replaceAll(/(\d+)/g, '**$1**')}`
            : `**0** seconds`
        }.`
      );

    let slowmodeStr = args[0];
    let method = 'set';

    if (slowmodeStr.startsWith('+') || slowmodeStr.startsWith('-')) {
      method = slowmodeStr.startsWith('+') ? 'add' : 'remove';
      slowmodeStr = slowmodeStr.slice(1);
    }

    let slowmode = +slowmodeStr || Math.floor(ms(slowmodeStr) / 1000);
    if (Number.isNaN(slowmode)) throw 'Invalid slowmode.';

    switch (method) {
      case 'add':
        slowmode += message.channel.rateLimitPerUser ?? 0;
        break;
      case 'remove':
        slowmode = (message.channel.rateLimitPerUser ?? 0) - slowmode;
        break;
      case 'set':
        slowmode = slowmode;
    }

    if (slowmode !== 0 && slowmode < 1) slowmode = 0;
    if (slowmode > 21600) throw 'Slowmode cannot be greater than **6** hours.';

    message.channel.setRateLimitPerUser(slowmode);
    if (slowmode === 0) return message.channel.send('Slowmode has been turned off, goodluck!');
    return message.channel.send(`Slowmode set to ${ms(slowmode * 1000, { long: true }).replaceAll(/(\d+)/g, '`$1`')}.`);
  }
}

export default SlowmodeCommand;
