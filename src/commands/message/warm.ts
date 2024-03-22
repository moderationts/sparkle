import { PermissionFlagsBits, type Message } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getMember } from '../../lib/util/functions';

@properties<'message'>({
  name: 'warm',
  description: "Warm someone bc they're cold.",
  userPermissions: PermissionFlagsBits.ManageMessages
})
class WarmCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'Am i supposed to warm the air? Provide a member dude.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';

    let failed = false;

    await member.send({ content: 'You have been warmed!!1!!!1!' }).catch(() => (failed = true));
    if (failed) return message.channel.send({ content: `Failed to warm **${member.user.username}**!!1!!!1!` });
    return message.channel.send({ content: `Warmed **${member.user.username}**!!1!!!1!` });
  }
}

export default WarmCommand;
