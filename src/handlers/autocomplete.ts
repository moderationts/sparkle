import { AutocompleteInteraction } from 'discord.js';
import { commonDurations, commonDurationUnits } from '../lib/util/constants';
import { Escalation } from '../types';
import ms from 'ms';
import client from '../client';

export default async function (interaction: AutocompleteInteraction<'cached'>) {
  const focused = interaction.options.getFocused(true);
  const focusedLowercase = focused.value.toLowerCase();

  switch (focused.name) {
    case 'duration':
    case 'erase-after':
    case 'in':
    case 'within':
    case 'disregard-after':
    case 'slowmode': {
      if (focusedLowercase.length === 0) return interaction.respond(commonDurations);
      let [numStr, unit] = focusedLowercase.split(' ');
      const num = +numStr;
      if (unit === undefined) unit = '';
      if (unit.endsWith('s')) unit = unit.slice(0, -1);

      if (Number.isNaN(num) || !Number.isInteger(num) || num < 1 || num > 1000) return interaction.respond([]);
      const matchingUnits = commonDurationUnits.filter(un => un.includes(unit));

      if (num === 1) return interaction.respond(matchingUnits.map(unit => ({ name: `1 ${unit}`, value: `1 ${unit}` })));
      else
        return interaction.respond(matchingUnits.map(unit => ({ name: `${num} ${unit}s`, value: `${num} ${unit}s` })));
    }
    case 'with-in': {
      const type = interaction.options.getString('type');
      const amount = interaction.options.getInteger('amount');

      if (!type) return interaction.respond([]);
      if (!amount) return interaction.respond([]);

      const selectType = type === 'Manual' ? 'escalationsManual' : 'escalationsAutoMod';
      const selectTypeAsQuery = type === 'Manual' ? { escalationsManual: true } : { escalationsAutoMod: true };

      const escalations = (await client.db.guild.findUnique({
        where: { id: interaction.guildId },
        select: selectTypeAsQuery
      }))![selectType] as Escalation[];

      const relevant = escalations.filter(e => e.amount === amount && e.within !== '0');

      const respondData = relevant
        .map(e => ({ name: ms(+e.within, { long: true }), value: e.within }))
        .filter(e => e.name.includes(focusedLowercase))
        .sort((a, b) => +a.value - +b.value)
        .slice(0, 25);

      if (respondData.length === 0) return;

      return interaction.respond(respondData);
    }
  }
}
