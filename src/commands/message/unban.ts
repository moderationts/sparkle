import { PunishmentType } from '../../lib/util/constants';
import { PermissionFlagsBits, Message, Colors } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { genID, getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'unban',
  description: 'Unban a member from the guild.',
  args: '<user> [reason]',
  aliases: ['ub', 'unbanish', 'pardon'],
  clientPermissions: PermissionFlagsBits.BanMembers,
  userPermissions: PermissionFlagsBits.BanMembers
})
class UnbanCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'You must provide a user to unban.';

    const user = await getUser(args[0]);
    if (!user) throw 'Invalid user.';

    if (!(await message.guild.bans.fetch(user.id).catch(() => null))) throw 'That user is not banned.';

    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to unban.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    const date = Date.now();

    message.guild.members.unban(user.id, reason);
    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: user.id,
        guildId: message.guildId,
        type: PunishmentType.Unban,
        date,
        moderatorId: message.author.id,
        reason
      }
    });

    const alts = await this.client.db.alt.findMany({
      where: {
        guildId: message.guildId,
        mainId: user.id
      }
    });

    const altNames = await Promise.all(
      alts.map(async alt => {
        const altUser = await this.client.users.fetch(alt.id);
        return `${altUser.toString()}`;
      })
    );

    message.channel.send({
      content: alts.length > 0 ? `This user has the following alts registered: ${altNames.join(', ')}` : undefined,
      embeds: [{ description: `${user.toString()} has been **unbanned** | \`${punishment.id}\``, color: Colors.Green }]
    });
    this.client.punishments.createLog(punishment);
  }
}

export default UnbanCommand;
