import autocomplete from '../handlers/autocomplete';
import buttonPress from '../handlers/buttonPress';
import chatInputCommand from '../handlers/chatInputCommand';
import contextMenuCommand from '../handlers/contextMenuCommand';
import modalSubmit from '../handlers/modalSubmit';
import Listener from '../lib/structs/Listener';
import {
  InteractionType,
  type Interaction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ContextMenuCommandInteraction,
  ModalSubmitInteraction,
  ButtonInteraction
} from 'discord.js';

class InteractionCreateListener extends Listener {
  constructor() {
    super('interactionCreate');
  }

  async run(interaction: Interaction) {
    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        if (interaction.isChatInputCommand()) return chatInputCommand(interaction as ChatInputCommandInteraction);
        else return contextMenuCommand(interaction as ContextMenuCommandInteraction);
      case InteractionType.ApplicationCommandAutocomplete:
        return autocomplete(interaction as AutocompleteInteraction<'cached'>);
      case InteractionType.ModalSubmit:
        return modalSubmit(interaction as ModalSubmitInteraction);
      case InteractionType.MessageComponent:
        if (interaction.isButton()) return buttonPress(interaction as ButtonInteraction);
    }
  }
}

export default InteractionCreateListener;
