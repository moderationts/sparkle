import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  type Message,
  ModalSubmitInteraction,
  TextChannel,
  hideLinkEmbed
} from 'discord.js';
import Modal from '../lib/structs/Modal';
import { genID, getUser } from '../lib/util/functions';
import Config from '../lib/util/config';
import { ReportType } from '../lib/util/constants';

class ReportModal extends Modal {
  constructor() {
    super('report');
  }

  async run(interaction: ModalSubmitInteraction<'cached'>) {
    const config = Config.get(interaction.guildId)!;
    const type = interaction.customId.split(':')[1].split('.')[0];

    await interaction.deferReply({ ephemeral: true });

    switch (type) {
      case 'user': {
        const id = interaction.customId.split('.')[1];
        const user = await getUser(id);

        const reason = interaction.fields.getTextInputValue('reason');

        const exists = await this.client.db.report.findFirst({
          where: {
            guildId: interaction.guildId,
            userId: user!.id,
            reporterId: interaction.user.id,
            type: ReportType.User,
            reason: reason
          }
        });

        if (exists) throw 'You have already submitted a report with these details.';
        if (!config.data.reports?.user?.channelId) throw 'The reports channel has not been configured.';

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

        const logChannel = await this.client.channels.fetch(config.data.reports.user?.channelId);

        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setAuthor({
              name: `User report from ${interaction.user.username} (${interaction.user.id})`,
              iconURL: interaction.user.displayAvatarURL()
            })
            .setColor(Colors.Yellow)
            .setDescription(
              `**Report ID:** \`${report.id}\`\n**Report Type:** User\n\n**Reported User:** ${user!.toString()} (\`${
                user?.id
              }\`)\n**Report Reason:** \`\`\`${reason}\`\`\``
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
      case 'message': {
        const mId = interaction.customId.split('.')[1];
        const chId = interaction.customId.split('.')[2];

        const channel = (await interaction.guild.channels.fetch(chId)) as TextChannel;
        const message = (await channel!.messages.fetch(mId)) as Message;

        const reason = interaction.fields.getTextInputValue('reason');

        const exists = await this.client.db.report.findFirst({
          where: {
            guildId: interaction.guildId,
            userId: message!.id,
            reporterId: interaction.user.id,
            type: ReportType.Message,
            reason: reason
          }
        });

        if (exists) throw 'You have already submitted a message report with these details.';
        if (!config.data.reports?.message?.channelId) throw 'The message reports channel has not been configured.';

        const report = await this.client.db.report.create({
          data: {
            id: genID(),
            guildId: interaction.guildId,
            userId: message!.id,
            reporterId: interaction.user.id,
            reason: reason,
            date: BigInt(Date.now()),
            type: ReportType.Message
          }
        });

        const logChannel = await this.client.channels.fetch(config.data.reports.message?.channelId);

        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setAuthor({
              name: `Message report from ${interaction.user.username} (${interaction.user.id})`,
              iconURL: interaction.user.displayAvatarURL()
            })
            .setColor(Colors.Yellow)
            .setDescription(
              `**Report ID:** \`${report.id}\`\n**Report Type:** Message\n\n**Reported Message ID:** \`${
                message.id
              }\`\n**Reported Message URL:** [Click Me!](${hideLinkEmbed(
                message.url
              )})\n**Channel ID:** ${message.channel.toString()} (\`${
                message.channel.id
              }\`)\n**Message Preview:** \`\`\`${message.content.slice(0, 100)}${
                message.content.length > 100 ? '...' : ''
              }\`\`\`\n**Report Reason:** \`\`\`${reason}\`\`\``
            )
            .setFooter({ text: 'Report Received' })
            .setTimestamp(Date.now());

          const acceptButton = new ButtonBuilder()
            .setCustomId(`report-manager:accept.${report.id}.${message.author.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success);

          const denyButton = new ButtonBuilder()
            .setCustomId(`report-manager:deny.${report.id}.${message.author.id}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger);

          const disregardButton = new ButtonBuilder()
            .setCustomId(`report-manager:disregard.${report.id}.${message.author.id}`)
            .setLabel('Disregard')
            .setStyle(ButtonStyle.Secondary);

          const contextButton = new ButtonBuilder()
            .setCustomId(`report-manager:context.${report.id}.${message.author.id}`)
            .setLabel('User Info')
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder<ButtonBuilder>();
          row.addComponents(acceptButton, denyButton, disregardButton, contextButton);

          logChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
        }

        await interaction.editReply({
          content: `Message report submitted successfully. You reported [this message](${hideLinkEmbed(
            message.url
          )}) for \`${reason}\`. Your report ID is \`${report.id}\`.`
        });
        return;
      }
    }
  }
}

export default ReportModal;
