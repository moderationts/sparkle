import { Colors, Message, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { adequateHierarchy, genID, getFlag, getMember, parseDuration } from '../../lib/util/functions';
import { ConfigData } from '../../lib/structs/Interfaces';
import { PunishmentType } from '../../lib/util/constants';
import { Escalation } from '../../types';
import ms from 'ms';
import numberToWord from 'number-to-words';

@properties<'message'>({
  name: 'warn',
  description: 'Issue a warning for a member.',
  args: '<member> [duration] <reason> [--silent]',
  aliases: ['w', 'strike'],
  clientPermissions: [
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers
  ],
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class WarnCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (args.length === 0) throw 'You must provide a member to warn.';

    const member = await getMember(message.guild, args[0]);
    if (!member) throw 'The provided user is not in this guild.';
    if (member.id === message.author.id) throw 'You cannot warn yourself.';
    if (member.id === this.client.user!.id) throw 'You cannot warn me.';

    if (!adequateHierarchy(message.member!, member)) throw 'You cannot warn this member due to inadequete hierarchy.';

    if (!adequateHierarchy(message.guild.members.me!, member))
      return message.reply(
        "**Configuration error.**\n> I cannot warn this member due to inadequete hierarchy.\n> To fix this, make sure my role is above this member's highest position role."
      );

    const durationStr = args[1];
    let duration = null;
    if (durationStr && durationStr !== 'permanent') duration = parseDuration(durationStr);

    if (duration && duration < 1000) throw 'Temporary warn duration must be at least 1 second.';

    const date = Date.now();

    let expires = duration ? duration + date : null;

    if (duration || durationStr === 'permanent') args.shift();
    const reason = args.slice(1).join(' ');
    if (!reason) throw 'You must provide a reason to warn';
    if (reason.length > 3500) throw `The reason may only be a maximum of 3500 characters (${reason.length} provided.)`;

    if (!expires && durationStr !== 'permanent' && config.punishments?.defaultWarnDuration !== 0n)
      expires = Number(config.punishments?.defaultWarnDuration) + date;

    message.delete().catch(() => {});
    const punishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: member.id,
        guildId: message.guildId,
        date,
        moderatorId: message.author.id,
        expires,
        reason
      }
    });

    if (!silentFlag) this.client.punishments.createDM(punishment);

    const alts = await this.client.db.alt.findMany({
      where: {
        guildId: message.guildId,
        mainId: member.id
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
      embeds: [{ description: `${member.toString()} has been **warned** | \`${punishment.id}\``, color: Colors.Yellow }]
    });
    this.client.punishments.createLog(punishment);

    // ESCALATION CHECK!

    const guild = await this.client.db.guild.findUnique({
      where: {
        id: message.guildId
      }
    });

    const punishmentHistory = await this.client.db.punishment.findMany({
      where: {
        guildId: message.guildId,
        userId: member!.id,
        type: PunishmentType.Warn,
        moderatorId: { not: this.client.user!.id }
      },
      orderBy: {
        date: 'desc'
      }
    });

    if (punishmentHistory.length === 0) return false;

    // find matching escalations
    const escalation = (JSON.parse(guild!.escalationsManual) as Escalation[]).reduce(
      (prev, curr) => {
        const within = +curr.within;

        return punishmentHistory.length >= curr.amount &&
          curr.amount >= prev.amount &&
          (within !== 0
            ? within < (+prev.within || Infinity) && date - Number(punishmentHistory[curr.amount - 1].date) <= within
            : curr.amount !== prev.amount)
          ? curr
          : prev;
      },
      { amount: 0, within: '0', punishment: PunishmentType.Warn, duration: '0' }
    );

    if (escalation.amount === 0) return false;

    const eDuration = +escalation.duration;
    const eExpires = eDuration ? date + eDuration : null;

    const ePunishment = await this.client.db.punishment.create({
      data: {
        id: genID(),
        userId: member.user.id,
        guildId: message.guildId,
        type: escalation.punishment,
        date,
        moderatorId: message.author.id,
        expires: eExpires,
        reason: `Receiving ${numberToWord.toWords(escalation.amount)} strikes${
          escalation.within !== '0' ? ` within a period of ${ms(+escalation.within, { long: true })}` : ''
        }.`
      }
    });

    if (eExpires) {
      const data = {
        guildId: message.guildId,
        userId: member.user.id,
        type: escalation.punishment,
        expires: eExpires
      };

      await this.client.db.task.upsert({
        where: {
          userId_guildId_type: {
            userId: member.user.id,
            guildId: message.guildId,
            type: escalation.punishment
          }
        },
        update: data,
        create: data
      });
    }

    if (!silentFlag) await this.client.punishments.createDM(ePunishment);

    switch (escalation.punishment) {
      case PunishmentType.Ban:
        await member!.ban({ reason: ePunishment.reason });
        break;
      case PunishmentType.Kick:
        if (member) await member!.kick(ePunishment.reason);
        break;
      case PunishmentType.Mute:
        if (member) await member!.timeout(Number(eDuration), ePunishment.reason);
        break;
    }

    this.client.punishments.createLog(ePunishment);
  }
}

export default WarnCommand;
