import { type ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Command, { data } from '../../lib/structs/Command';
import ms from 'ms';
import { EscalationType, Escalation } from '../../types';
import { PunishmentType } from '../../lib/util/constants';

@data(
  new SlashCommandBuilder()
    .setName('escalations')
    .setDescription('Escalations allow you to punish members for reaching an amount of warnings.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(cmd =>
      cmd
        .setName('add')
        .setDescription('Add an escalation to the list of escalations.')
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('How many warnings the member has to accumulate before being punished.')
            .setMinValue(2)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Whether this is an escalation for automod warnings or for manual warnings.')
            .addChoices({ name: 'Manual', value: 'Manual' }, { name: 'AutoMod', value: 'AutoMod' })
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('punishment')
            .setDescription('The punishment to give for reaching `amount` warnings.')
            .addChoices(
              { name: 'Mute', value: PunishmentType.Mute },
              { name: 'Kick', value: PunishmentType.Kick },
              { name: 'Ban', value: PunishmentType.Ban }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('duration').setDescription('The duration of the punishment').setAutocomplete(true)
        )
        .addStringOption(opt =>
          opt
            .setName('within')
            .setDescription('Within what time frame the amount of infractions have to be accumulated.')
            .setAutocomplete(true)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('remove')
        .setDescription('Remove an escalation from the list of escalations.')
        .addIntegerOption(opt =>
          opt
            .setName('amount')
            .setDescription('How many warnings the member has to accumulate before being punished.')
            .setMinValue(2)
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Whether this is an escalation for automod warnings or for manual warnings.')
            .addChoices({ name: 'Manual', value: 'Manual' }, { name: 'AutoMod', value: 'AutoMod' })
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('with-in')
            .setDescription('Within what time frame the amount of infractions have to be accumulated.')
            .setAutocomplete(true)
        )
    )
    .addSubcommand(cmd =>
      cmd
        .setName('view')
        .setDescription('View all escalations.')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Whether this is an escalation for automod warnings or for manual warnings.')
            .addChoices({ name: 'Manual', value: 'Manual' }, { name: 'AutoMod', value: 'AutoMod' })
            .setRequired(true)
        )
    )
)
class EscalationsCommand extends Command {
  async run(interaction: ChatInputCommandInteraction<'cached'>) {
    const subCmd = interaction.options.getSubcommand();
    const type = interaction.options.getString('type', true) as EscalationType;

    const guild = (await this.client.db.guild.findUnique({
      where: {
        id: interaction.guildId
      }
    }))!;

    const escalations = JSON.parse(
      type === 'Manual' ? guild.escalationsManual : guild.escalationsAutoMod
    ) as Escalation[];

    switch (subCmd) {
      case 'add': {
        const amount = interaction.options.getInteger('amount', true);
        const uWithin = interaction.options.getString('within') ?? '0';
        const within = ms(uWithin);

        const punishment = interaction.options.getString('punishment', true) as PunishmentType;
        const uDuration = interaction.options.getString('duration');
        const duration = uDuration ? ms(uDuration) : null;

        if (duration === undefined) throw 'Invalid duration.';
        if (punishment === PunishmentType.Mute && !duration) throw 'A duration is required for punishment `Mute`.';
        if (punishment === PunishmentType.Kick && duration)
          throw 'A duration cannot be provided for punishment `Kick`.';

        if (escalations.some(e => e.amount === amount && +e.within === within))
          throw `There is already an escalation for this amount${within ? ' for this duration' : ''}.`;

        escalations.push({
          amount: amount,
          within: within.toString(),
          duration: duration?.toString() ?? '0',
          punishment
        });

        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data:
            type === 'Manual'
              ? { escalationsManual: JSON.stringify(escalations) }
              : { escalationsAutoMod: JSON.stringify(escalations) }
        });

        return interaction.reply(
          `Escalation added: ${punishment.toLowerCase()} a member${
            duration ? ` for ${ms(duration, { long: true })}` : ''
          } for having or exceeding ${amount} ${type.toLowerCase()} warnings${
            within ? ` within ${ms(Number(within), { long: true })}` : ''
          }.`
        );
      }
      case 'remove': {
        const amount = interaction.options.getInteger('amount', true);
        const uWithin = interaction.options.getString('with-in') ?? '0';
        const within = ms(uWithin);

        const escalation = escalations.find(e => e.amount === amount && +e.within === within);
        if (!escalation) throw `There is no escalation for this amount${within ? ' for this duration' : ''}.`;

        escalations.splice(escalations.indexOf(escalation), 1);

        await this.client.db.guild.update({
          where: { id: interaction.guildId },
          data:
            type === 'Manual'
              ? { escalationsManual: JSON.stringify(escalations) }
              : { escalationsAutoMod: JSON.stringify(escalations) }
        });

        return interaction.reply(
          `Escalation removed: ${escalation.punishment.toLowerCase()} a member${
            escalation.duration !== '0' ? ` for ${ms(+escalation.duration, { long: true })}` : ''
          } for having or exceeding ${amount} ${type.toLowerCase()} warnings${
            within ? ` within ${ms(Number(within), { long: true })}` : ''
          }.`
        );
      }
      case 'view': {
        if (escalations.length === 0)
          return interaction.reply(`This guild has no ${type.toLowerCase()} escalations set up.`);

        const escalationsStr = escalations
          .sort((a, b) => (a.amount !== b.amount ? a.amount - b.amount : +a.within - +b.within))
          .map(
            e =>
              `${e.amount} ${+e.within !== 0 ? `within ${ms(+e.within, { long: true })} ` : ''}= ${e.punishment} ${
                e.duration !== '0' ? `for ${ms(Number(e.duration), { long: true })}` : ''
              }`
          )
          .join('\n');
        return interaction.reply(`Escalations for ${type.toLowerCase()} warnings:\`\`\`\n${escalationsStr}\`\`\``);
      }
    }
  }
}

export default EscalationsCommand;
