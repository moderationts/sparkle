import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';
import Command, { properties } from '../../lib/structs/Command';
import { PunishmentType } from '@prisma/client';
import ms from 'ms';
import { punishmentColors } from '../../lib/util/constants';
import { getUser } from '../../lib/util/functions';

@properties<'message'>({
  name: 'punishment',
  description: 'View detailed information on a punishment.',
  args: '<id>',
  aliases: ['punishinfo', 'caseinfo', 'case'],
  userPermissions: PermissionFlagsBits.ModerateMembers
})
class PunishmentCommand extends Command {
  async run(message: Message<true>, args: string[]) {
    if (args.length === 0) throw 'You must provide a punishment id.';

    const id = args[0];

    const punishment = await this.client.db.punishment.findUnique({
      where: {
        id
      }
    });

    if (!punishment || punishment.guildId !== message.guildId) throw 'No punishment with that ID exists in this guild.';

    const moderator = await getUser(punishment.moderatorId);
    const user = await getUser(punishment.userId);

    const punishmentEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${moderator!.username} (${moderator!.id})`,
        iconURL: moderator!.displayAvatarURL()
      })
      .setColor(punishmentColors[punishment.type])
      .setDescription(
        `**${
          punishment.type === PunishmentType.Ban || punishment.type === PunishmentType.Unban ? 'User' : 'Member'
        }:** \`${user!.username}\` (${punishment.userId})\n**Action:** ${punishment.type.toString()}${
          punishment.expires
            ? `\n**Duration:** ${ms(Number(punishment.expires - punishment.date), {
                long: true
              })}\n**Expires:** <t:${Math.floor(Number(punishment.expires) / 1000)}> (<t:${Math.floor(
                Number(punishment.expires) / 1000
              )}:R>)`
            : ''
        }\n**Reason:** ${punishment.reason}`
      )
      .setFooter({ text: `Punishment ID: ${punishment.id}` })
      .setTimestamp(Number(punishment.date));

    return message.channel.send({ embeds: [punishmentEmbed] });
  }
}

export default PunishmentCommand;
