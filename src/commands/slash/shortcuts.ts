import { PunishmentType } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ApplicationCommandOptionType as OptionType,
  EmbedBuilder,
  PermissionsBitField
} from 'discord.js';
import ms from 'ms';
import Command, { data } from '../../lib/structs/Command';
import { d28, mainColor } from '../../lib/util/constants';
import { bin } from '../../lib/util/functions';
const nameReg = /^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]+$/u;

@data(
  new SlashCommandBuilder()
    .setName('shortcuts')
    .setDescription('Manage the shortcuts on this guild.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(command =>
      command
        .setName('create')
        .setDescription('Create a punishment shortcut')
        .addStringOption(option =>
          option.setName('name').setDescription('The name of the shortcut.').setMaxLength(30).setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('The description of the shortcut')
            .setMaxLength(100)
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('permission')
            .setDescription('(Can be overriden) The permission a member needs to run this command.')
            .setRequired(true)
            .addChoices(
              { name: 'Manage Messages', value: Number(PermissionFlagsBits.ManageMessages) },
              { name: 'Moderate Members', value: Number(PermissionFlagsBits.ModerateMembers) },
              { name: 'Kick Members', value: Number(PermissionFlagsBits.KickMembers) },
              { name: 'Ban Members', value: Number(PermissionFlagsBits.BanMembers) }
            )
        )
        .addStringOption(option =>
          option
            .setName('punishment')
            .setDescription('The punishment command.')
            .setRequired(true)
            .addChoices(
              { name: 'Warn', value: PunishmentType.Warn },
              { name: 'Mute', value: PunishmentType.Mute },
              { name: 'Kick', value: PunishmentType.Kick },
              { name: 'Ban', value: PunishmentType.Ban },
              { name: 'Unmute', value: PunishmentType.Unmute },
              { name: 'Unban', value: PunishmentType.Unban }
            )
        )
        .addStringOption(option =>
          option.setName('reason').setDescription('The reason for the punishment.').setMaxLength(1000).setRequired(true)
        )
        .addStringOption(option =>
          option.setName('duration').setDescription('Duration for the punishment.').setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('delete-previous-messages')
            .setDescription('Delete messages sent in past...')
            .addChoices(
              { name: 'Previous hour', value: '1h' },
              { name: 'Previous 6 hours', value: '6h' },
              { name: 'Previous 12 hours', value: '12h' },
              { name: 'Previous 24 hours', value: '24h' },
              { name: 'Previous 3 days', value: '3d' },
              { name: 'Previous 7 days', value: '7d' }
            )
        )
        .addStringOption(option =>
          option
            .setName('additional-info')
            .setDescription('Additional information for the punishment. This overrides the defaults.')
            .setMaxLength(1000)
        )
    )
    .addSubcommand(command =>
      command
        .setName('delete')
        .setDescription('Delete a shortcut.')
        .addStringOption(option => option.setName('name').setDescription('Name of the shortcut.').setRequired(true))
    )
)
class ShortcutsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const sc = interaction.options.getSubcommand();

    if (sc === 'create') {
      const name = interaction.options.getString('name', true);
      if (!name.match(nameReg))
        throw 'The provided name contains illegal characters. Try limiting the name to letters, numbers, and dashes.';

      const alreadyACommand = this.client.commands.slash.has(name) || this.client.aliases.has(name);
      if (alreadyACommand) throw 'Shortcut name cannot match built in command names.';

      const description = interaction.options.getString('description', true);
      const permission = interaction.options.getInteger('permission', true);
      const punishment = interaction.options.getString('punishment', true) as PunishmentType;
      const reason = interaction.options.getString('reason', true);
      const uDuration = interaction.options.getString('duration');
      const uDeleteTime = interaction.options.getString('delete-previous-messages');
      const additionalInfo = interaction.options.getString('additional-info')!;

      for (const key in this.client.commands.slash.keys())
        if (key === name) throw 'You cannot create a shortcut with the name of a command.';

      if (
        uDuration &&
        (punishment === PunishmentType.Unmute ||
          punishment === PunishmentType.Unban ||
          punishment === PunishmentType.Kick)
      )
        throw 'You cannot provide a duration for this kind of punishment.';
      if (uDeleteTime && punishment !== PunishmentType.Ban)
        throw 'You cannot provide a value for the `delete-previous-messages` option for this kind of punishment.';

      const duration = uDuration ? +uDuration * 1000 || ms(uDuration) : null;
      const deleteTime = uDeleteTime ? ms(uDeleteTime) / 1000 : null;

      if (uDuration && !duration && duration !== 0) throw 'Invalid duration.';
      if (duration && duration < 1000) throw 'Duration must be at least 1 second.';
      if (!duration && punishment === PunishmentType.Mute) throw 'A duration must be provided for type `mute`.';
      if (punishment === PunishmentType.Mute && duration! > d28)
        throw 'The duration cannot be over 28 days for the mute punishment.';

      const count = await this.client.db.shortcut.count({
        where: {
          guildId: interaction.guildId
        }
      });

      if (count >= 100) throw 'You cannot create more than 100 shortcuts.';

      const exists = await this.client.db.shortcut.findUnique({
        where: {
          guildId_name: { guildId: interaction.guildId, name }
        }
      });

      if (exists) throw 'A shortcut with that name already exists.';

      await interaction.deferReply();

      await this.client.db.shortcut.create({
        data: {
          guildId: interaction.guildId,
          name: name,
          description,
          punishment,
          reason,
          duration: duration ? BigInt(duration) : undefined,
          deleteTime,
          permission,
          additionalInfo
        }
      });

      return interaction.editReply('Shortcut created.');
    } else if (sc === 'delete') {
      const name = interaction.options.getString('name', true);

      await interaction.deferReply();
      const worked = await this.client.db.shortcut
        .delete({
          where: {
            guildId_name: { guildId: interaction.guildId, name }
          }
        })
        .catch(() => false);

      if (!worked) throw 'Shortcut does not exist.';
      return interaction.editReply('Shortcut deleted.');
    }
  }
}

export default ShortcutsCommand;
