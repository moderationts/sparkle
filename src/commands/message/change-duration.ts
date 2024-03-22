import { EmbedBuilder, Message, MessageCollector, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import ms from 'ms';
import { PunishmentType } from '@prisma/client';
import { adequateHierarchy, getFlag, getMember, parseDuration } from '../../lib/util/functions';
import { PreconditionType, d28, infractionsPerPage, mainColor, punishmentColors } from '../../lib/util/constants';
import { ConfigData, PunishmentEdit } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'change-duration',
  description: 'Change the duration of a punishment.',
  args: '<id> <duration> [reason] [--silent]',
  aliases: ['duration'],
  clientPermissions: PermissionFlagsBits.ModerateMembers,
  userPermissions: PermissionFlagsBits.ModerateMembers,
  precondition: PreconditionType.PunishmentEditor
})
class DurationCommand extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (!message.member!.roles.cache.some(role => config.punishments?.editors?.includes(role.id)))
      throw 'You must be a punishment editor to change the duration of a punishment.';

    if (args.length === 0) throw 'You must provide a punishment ID, new duration, and reason for the change.';
    if (args.length === 1) throw 'You must provide a new duration, and reason.';
    if (args.length === 2) throw 'You must provide a reason to change the duration of a punishment.';

    const id = args[0];
    const reason = args.slice(2).join(' ');

    const durationStr = args[1];
    let duration: number | null = null;

    if (durationStr.toLowerCase() === 'permanent') duration = 0;
    else {
      duration = parseDuration(durationStr);
      if (Number.isNaN(duration)) throw 'Invalid duration.';
    }

    if (duration !== 0 && duration < 1000) throw 'The new duration must be at least 1 second.';

    const date = Date.now();
    const expires = duration ? date + duration : null;

    const punishment = await this.client.db.punishment.findUnique({
      where: {
        id
      }
    });

    if (punishment?.guildId !== message.guildId) throw 'No punishment with that ID exists in this guild.';

    if (
      punishment.type === PunishmentType.Unban ||
      punishment.type === PunishmentType.Unmute ||
      punishment.type === PunishmentType.Kick
    )
      throw 'You cannot change the duration for that kind of punishment.';

    if (punishment.expires !== null && date >= punishment.expires) throw 'That punishment has already expired.';
    if (punishment.expires === expires) throw 'This punishment is already set to that duration.';

    const member = await getMember(message.guild, punishment.userId);

    if (punishment.type === PunishmentType.Mute) {
      if (duration > d28 || duration === 0) throw 'Mute duration must be 28 days or less.';
      if (!member) throw 'I cannot change the duration of the mute because the user is no longer in the server.';

      if (!adequateHierarchy(message.guild.members.me!, member))
        return message.reply(
          '**Configuration error.**\n> I cannot update the duration of this mute due to inadequete hierarchy.\n> To fix this, make sure my role is above the role of the member this punishment is issued for.'
        );
    }

    await message.reply(
      `Are you sure you want to change the duration of the ${punishment.type.toLowerCase()} punishment \`${
        punishment.id
      }\` for <@!${punishment.userId}> (${
        punishment.userId
      })? This is a dangerous operation and it cannot be undone. To confirm say \`yes\`. To cancel say \`cancel\`.`
    );

    const filter = (response: { content: string; author: { id: string } }) => {
      return ['yes', 'cancel'].includes(response.content.toLowerCase()) && response.author.id === message.author.id;
    };

    const collector = new MessageCollector(message.channel, { filter, time: 15000 });

    collector.on('collect', async response => {
      if (response.content.toLowerCase() === 'yes') {
        if (punishment.type === PunishmentType.Mute) await member?.timeout(duration, reason);

        await this.client.db.punishment.update({
          where: { id },
          data: {
            expires
          }
        });

        if (punishment.type !== PunishmentType.Warn) {
          if (expires)
            await this.client.db.task.update({
              where: {
                userId_guildId_type: {
                  userId: punishment.userId,
                  guildId: message.guildId,
                  type: punishment.type
                }
              },
              data: {
                expires
              }
            });
          else
            await this.client.db.task.delete({
              where: {
                userId_guildId_type: {
                  userId: punishment.userId,
                  guildId: message.guildId,
                  type: punishment.type
                }
              }
            });
        }
        const expiresStr = Math.floor(Number(expires) / 1000);

        const notifyDM = new EmbedBuilder()
          .setAuthor({ name: `${this.client.user!.username}`, iconURL: this.client.user!.displayAvatarURL() })
          .setTitle(`${punishment.type} Duration Changed`)
          .setColor(punishmentColors[punishment.type])
          .addFields({
            name: 'New Expiration',
            value: `${expires ? `<t:${expiresStr}> (<t:${expiresStr}:R>)` : 'Never'}`
          })
          .setFooter({ text: `Original Punishment ID: ${punishment.id}` })
          .setTimestamp();

        if (member && !silentFlag) await member.send({ embeds: [notifyDM] }).catch(() => {});

        await message.channel.send(
          `${punishment.type} duration of punishment \`${punishment.id}\` for <@${punishment.userId}> changed to \`${
            duration ? ms(duration, { long: true }) : 'permanent'
          }\`.`
        );

        this.client.punishments.createEditLog(
          {
            id: punishment.id,
            guildId: punishment.guildId,
            userId: punishment.userId,
            moderatorId: message.author.id,
            type: punishment.type,
            reason: reason,
            oldExpiration: punishment.expires,
            newExpiration: expires
          } as PunishmentEdit,
          'expiration'
        );
      } else if (response.content.toLowerCase() === 'cancel') {
        await message.channel.send('Operation cancelled.');
      }
      collector.stop();
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        message.channel.send('Confirmation timed out. Operation automatically canceled.');
      }
    });
  }
}

export default DurationCommand;
