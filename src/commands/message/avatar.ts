import { Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getUser } from '../../lib/util/functions';
import { mainColor } from '../../lib/util/constants';

@properties<'message'>({
  name: 'avatar',
  description: "Get a user's avatar.",
  args: '[user]',
  aliases: ['av', 'pfp'],
  commandChannel: true
})
class AvatarCommand extends Command {
  async run(message: Message, args: string[]) {
    const user = args.length > 0 ? await getUser(args[0]) : message.author;
    if (!user) throw 'Invalid user.';
    return message.channel.send({
      embeds: [
        {
          author: { name: `${user.username}'s Avatar`, icon_url: user.displayAvatarURL() },
          image: { url: user.displayAvatarURL({ size: 4096 }) },
          color: mainColor
        }
      ]
    });
  }
}

export default AvatarCommand;
