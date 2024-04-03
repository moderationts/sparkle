import { PermissionFlagsBits, type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'tag',
  description: 'Reference text.',
  args: ['<name> [user]'],
  aliases: ['rule', 'faq'],
  userPermissions: PermissionFlagsBits.ManageMessages,
  clientPermissions: PermissionFlagsBits.EmbedLinks
})
class TagCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    if (args.length === 0) throw 'You must provide a tag name to reference.';

    const target = await getUser(args.at(-1) as string);
    if (target) args.splice(-1, 1);

    if (args.length === 0) throw 'You must provide a tag name to reference.';

    const name = args.join(' ');

    const tag = config.tags?.find(tag => tag.name === name ?? tag.aliases.includes(name));
    if (!tag) throw 'That tag does not exist.';

    message.delete().catch(() => {});

    if (message.reference) {
      const ref = await message.fetchReference();
      return ref.reply({
        content: target ? `${target.toString()}` : undefined,
        embeds: [tag.embed],
        allowedMentions: { repliedUser: true, parse: ['users'] }
      });
    } else {
      return message.channel.send({
        content: target ? `${target.toString()}` : undefined,
        embeds: [tag.embed],
        allowedMentions: { parse: ['users'] }
      });
    }
  }
}

export default TagCommand;
