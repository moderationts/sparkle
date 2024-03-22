import { EmbedBuilder, Message, MessageCollector, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { getFlag, getMember } from '../../lib/util/functions';
import { PreconditionType, PunishmentType, punishmentColors } from '../../lib/util/constants';
import { ConfigData, PunishmentEdit } from '../../lib/structs/Interfaces';

@properties<'message'>({
  name: 'change-reason',
  description: 'Change the reason for a punishment.',
  args: '<id> <new_reason> [--silent]',
  aliases: ['switch-reason', 'reason'],
  userPermissions: PermissionFlagsBits.ModerateMembers,
  precondition: PreconditionType.PunishmentEditor
})
class ChangeReason extends Command {
  async run(message: Message<true>, args: string[], config: ConfigData) {
    const silentFlag = getFlag(message.content, 'silent', 's');
    if (silentFlag?.value) {
      const silentFlagTokens = silentFlag.formatted.split(/\s+/);
      args.splice(args.indexOf(silentFlagTokens[0]), silentFlagTokens.length);
    }

    if (!message.member!.roles.cache.some(role => config.punishments?.editors?.includes(role.id)))
      throw 'You must be a punishment editor to change the reason of a punishment.';

    if (args.length === 0) throw 'You must provide a punishment ID, and new reason.';
    if (args.length === 1) throw 'You must provide a new reason to change the reason of a punishment';

    const id = args[0];

    const newReason = args.slice(1).join(' ');
    if (newReason.length > 3500)
      throw `The new reason may only be a maximum of 3500 characters (${newReason.length} provided.)`;

    const punishment = await this.client.db.punishment.findUnique({
      where: {
        id
      }
    });

    if (punishment?.guildId !== message.guildId) throw 'No punishment with that ID exists in this guild.';

    if (newReason === punishment.reason) throw 'The two reasons cannot be the same.';

    await message.reply(
      `Are you sure you want to change the reason of the ${punishment.type.toLowerCase()} punishment \`${
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
        await this.client.db.punishment.update({
          where: {
            id
          },
          data: {
            reason: newReason
          }
        });

        const notifyDM = new EmbedBuilder()
          .setAuthor({ name: `${this.client.user!.username}`, iconURL: this.client.user!.displayAvatarURL() })
          .setTitle(`${punishment.type} Reason Changed`)
          .setColor(punishmentColors[punishment.type as PunishmentType])
          .addFields({
            name: 'New Reason',
            value: newReason
          })
          .setFooter({ text: `Original Punishment ID: ${punishment.id}` })
          .setTimestamp();

        const member = await getMember(message.guildId, punishment.userId);
        if (member && !silentFlag) await member.send({ embeds: [notifyDM] }).catch(() => {});

        await message.channel.send(
          `${punishment.type.toString()} reason of punishment \`${punishment.id}\` for <@${punishment.userId}> (${
            punishment.userId
          }) changed to \`${newReason}\`.`
        );
        this.client.punishments.createEditLog(
          {
            id: punishment.id,
            guildId: punishment.guildId,
            userId: punishment.userId,
            moderatorId: message.author.id,
            type: punishment.type,
            oldReason: punishment.reason,
            newReason: newReason
          } as PunishmentEdit,
          'reason'
        );
      } else if (response.content.toLowerCase() === 'cancel') {
        message.channel.send('Operation canceled.');
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

export default ChangeReason;
