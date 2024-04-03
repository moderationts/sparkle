import autocomplete from '../handlers/autocomplete';
import chatInputCommand from '../handlers/chatInputCommand';
import contextMenuCommand from '../handlers/contextMenuCommand';
import Listener from '../lib/structs/Listener';
import {
  InteractionType,
  type Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ContextMenuCommandInteraction
} from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        if (interaction.isChatInputCommand()) return chatInputCommand(interaction as ChatInputCommandInteraction);
        else if (interaction.isContextMenuCommand())
          return contextMenuCommand(interaction as ContextMenuCommandInteraction);
      case InteractionType.ApplicationCommandAutocomplete:
        return autocomplete(interaction as AutocompleteInteraction<'cached'>);
    }
  }
}

export default InteractionCreateListener;
