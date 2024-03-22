import { PermissionFlagsBits, Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'purge',
  description: 'Purge messages from a channel and/or user.',
  args: '[from] <count> [before]',
  aliases: ['clear', 'sweep'],
  clientPermissions: PermissionFlagsBits.ManageMessages,
  userPermissions: PermissionFlagsBits.ManageMessages
})
class PurgeCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'You must provide the count of messages to delete.';

    if (!message.channel) throw 'This command cannot be ran here.';
    if (!message.channel.permissionsFor(message.member!).has(PermissionFlagsBits.ManageMessages))
      throw 'You need the `Manage Messages` permission in this channel to execute this command.';

    if (!message.channel.permissionsFor(message.guild.members.me!).has(PermissionFlagsBits.ManageMessages))
      return message.reply(
        "**Configuration error.**\n> I could not execute this command as I'm missing the `Manage Messages` permission in this channel.\n> To fix this, please give me the `Manage Messages` permission for this channel."
      );

    const user = await getUser(args[0]);
    if (user) args.shift();

    if (args.length === 0) throw 'You must provide the count of messages to delete.';

    const count = +args[0];
    if (Number.isNaN(count) || !Number.isInteger(count)) throw 'Invalid count.';
    if (count < 1) throw 'Count must be at least 1.';
    if (count > 100) throw 'Count cannot be greater than 100.';

    const beforeStr = args[1];

    let before: string | undefined = undefined;
    if (beforeStr) {
      if (beforeStr.length >= 17 && beforeStr.length <= 19) {
        if (!(await message.channel.messages.fetch(beforeStr))) throw 'Invalid message ID.';

        before = beforeStr;
      } else if (beforeStr.startsWith('https://discord.com/channels/')) {
        // constexpr api_link_len = 29
        const [guildId, channelId, messageId] = beforeStr.slice(29).split('/');
        if (guildId !== message.guildId) throw 'The provided message link is not from this guild.';
        if (channelId !== message.channelId) throw 'The provided message link is not from this channel.';
        if (!(await message.channel.messages.fetch(messageId))) throw 'Invalid message link.';

        before = messageId;
      } else throw 'Invalid message ID or link.';
    }

    await message.delete().catch(() => {});

    if (user) {
      let deletedTotal = 0;

      for (let i = 0; i < 3; i++) {
        const messages = await message.channel.messages.fetch({ limit: 100, before }).then(msgs => {
          if (msgs.size == 0) return false;

          before = msgs.last()!.id;
          const userMsgs = [...msgs.values()].filter(msg => msg.author.id === user.id).slice(0, count - deletedTotal);

          if (userMsgs.length == 0) return false;
          return userMsgs;
        });

        if (!messages) break;

        const deletedCount = (await message.channel.bulkDelete(messages, true)).size;
        if (deletedCount === 0) break;
        deletedTotal += deletedCount;
      }

      return message.channel.send(`Deleted \`${deletedTotal}\` messages from ${user.toString()}.`).then(msg => {
        setTimeout(() => {
          msg.delete().catch(() => {});
        }, 5000);
      });
    }

    const messages = await message.channel.messages.fetch({ limit: count, before });
    const deletedTotal = (await message.channel.bulkDelete(messages, true)).size;

    return message.channel.send(`Deleted \`${deletedTotal}\` messages.`).then(msg => {
      setTimeout(() => {
        msg.delete().catch(() => {});
      }, 5000);
    });
  }
}

export default PurgeCommand;
