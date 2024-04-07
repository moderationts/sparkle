import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  type Message,
  ModalSubmitInteraction
} from 'discord.js';
import Modal from '../lib/structs/Modal';
import { genID, getUser } from '../lib/util/functions';
import Config from '../lib/util/config';
import { ReportType } from '@prisma/client';

class ReportModal extends Modal {
  constructor() {
    super('report');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    const config = Config.get(interaction.guildId)!;
    const type = interaction.customId.split(':')[1].split('.')[0];
    const id = interaction.customId.split('.')[1];
    const user = await getUser(id);

    const reason = interaction.fields.getTextInputValue('reason');

    interaction.deferReply({ ephemeral: true });

    if (type === 'user') {
      const exists = await this.client.db.report.findUnique({
        where: {
          guildId: interaction.guildId,
          userId: user!.id,
          type: ReportType.User,
          reason: reason
        }
      });

      if (exists) throw 'A report with these details already exists.';

      if (!config.data.reports?.channelId) throw 'The reports channel has not been configured.';

      const report = await this.client.db.report.create({
        data: {
          id: genID(),
          guildId: interaction.guildId,
          userId: user!.id,
          reporterId: interaction.user.id,
          reason: reason,
          date: BigInt(Date.now()),
          type: ReportType.User
        }
      });

      const logChannel = await this.client.channels.fetch(config.data.reports.channelId);

      if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: `User report from ${interaction.user.username} (${interaction.user.id})`,
            iconURL: interaction.user.displayAvatarURL()
          })
          .setColor(Colors.Yellow)
          .setDescription(
            `**Report ID:** \`${report.id}\`\n**Report Type:** User\n\n**Reported User:** ${user!.toString()} (${
              user?.id
            })\n**Report Reason:** \`\`\`${reason}\`\`\``
          )
          .setFooter({ text: 'Report Received' })
          .setTimestamp(Date.now());

        const acceptButton = new ButtonBuilder()
          .setCustomId(`report-manager:accept.${report.id}.${user!.id}`)
          .setLabel('Accept')
          .setStyle(ButtonStyle.Success);

        const denyButton = new ButtonBuilder()
          .setCustomId(`report-manager:deny.${report.id}.${user!.id}`)
          .setLabel('Deny')
          .setStyle(ButtonStyle.Danger);

        const disregardButton = new ButtonBuilder()
          .setCustomId(`report-manager:disregard.${report.id}.${user!.id}`)
          .setLabel('Disregard')
          .setStyle(ButtonStyle.Secondary);

        const contextButton = new ButtonBuilder()
          .setCustomId(`report-manager:context.${report.id}.${user!.id}`)
          .setLabel('User Info')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>();
        row.addComponents(acceptButton, denyButton, disregardButton, contextButton);

        logChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
      }

      await interaction.editReply({
        content: `Report submitted successfully. You reported ${user!.toString()} (\`${
          user!.id
        }\`) for \`${reason}\`. Your report ID is \`${report.id}\`.`
      });
      return;
    } 
  }
}

export default ReportModal;
