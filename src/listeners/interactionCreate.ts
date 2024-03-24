import autocomplete from '../handlers/autocomplete';
import chatInputCommand from '../handlers/chatInputCommand';
import Listener from '../lib/structs/Listener';
import { InteractionType, type Interaction, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        return chatInputCommand(interaction as ChatInputCommandInteraction);
      case InteractionType.ApplicationCommandAutocomplete:
        return autocomplete(interaction as AutocompleteInteraction<'cached'>);
    }
  }
}

export default InteractionCreateListener;
