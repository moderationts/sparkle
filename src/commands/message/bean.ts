import { PermissionFlagsBits, type Message, Colors, MessageCollector } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'bean',
  description: 'Beans beans beans beans.',
  userPermissions: PermissionFlagsBits.ManageMessages
})
class BeanCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Am i supposed to bean the air? Provide a member dude.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    await message.channel.send({
      embeds: [{ description: `**${member.user.username}** has been **beaned** | \`${member.id}\``, color: Colors.Red }]
    });

    const filter = (response: { author: { id: string } }) => {
      return response.author.id === member.id;
    };

    const collector = new MessageCollector(message.channel, { filter, time: 60000 });

    collector.on('collect', async response => {
      await response.react('🌱');
      collector.stop();
    });
  }
}

export default BeanCommand;
