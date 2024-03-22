import { PunishmentType } from '@prisma/client';
import { PermissionFlagsBits, Colors, Message, GuildMember } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, genID, getFlag, getMember, getUser, parseDuration } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'ban',
  description: 'Ban a member from the guild.',
  args: '<user> [duration] <reason> [--silent]',
  aliases: ['banish', 'b'],
  clientPermissions: PermissionFlagsBits.BanMembers,
  userPermissions: PermissionFlagsBits.BanMembers
})
class BanCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a user to ban.';

    const user = (await getMember(message.guild, args[0])) ?? (await getUser(args[0]));
    if (!user) throw 'This is not a valid user.';

    if (user.id === message.author.id) throw 'You cannot ban yourself.';
    if (user.id === this.client.user!.id) throw 'You cannot ban me.';

    if (user instanceof GuildMember) {
      if (!adequateHierarchy(message.member!, user)) throw 'You cannot ban this member due to inadequete hierarchy.';

      if (!adequateHierarchy(message.guild.members.me!, user))
        return message.reply(
          "**Configuration error.**\n>I cannot ban this member due to inadequete hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
        );
    }

    const durationStr = args[1];
    let duration = null;
    if (args.length >= 2 && args[1] !== 'permanent') duration = parseDuration(durationStr);

    const date = Date.now();

    if (duration && duration < 1000) throw 'Temporary ban duration must be at least 1 second.';
    let expires = duration ? duration + date : null;

    if (duration || durationStr === 'permanent') args.shift();
    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to ban.';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    if (
      !expires &&
      durationStr !== 'permanent' &&
      (config.punishments?.defaultBanDuration || config.punishments?.defaultBanDuration !== 0n)
    )
      expires = Number(config.punishments?.defaultBanDuration) + date;

    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: user.id,
        guildId: message.guildId,
        type: PunishmentType.Ban,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    if (expires) {
      const data = {
        guildId: message.guildId,
        userId: user.id,
        type: PunishmentType.Ban,
        expires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: { userId: user.id, guildId: message.guildId, type: PunishmentType.Ban }
        },
        update: data,
        create: data
      });
    } else
      await this.client.db.task
        .delete({
          where: {
            userId_guildId_type: { userId: user.id, guildId: message.guildId, type: PunishmentType.Ban }
          }
        })
        .catch(() => {});

    message.delete().catch(() => {});

    if (!silentFlag) await this.client.punishments.createDM(punishment);
    message.guild.members.ban(user.id, { reason });

    message.channel.send({
      embeds: [{ description: `${user.toString()} has been **banned** | \`${punishment.id}\``, color: Colors.Red }]
    });
    this.client.punishments.createLog(punishment);
  }
}

export default BanCommand;
