import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import messageCommand from '../handlers/messageCommand';
import automod from '../handlers/automod';

class MessageCreateListener extends Listener {
  constructor() {
    super('messageCreate');
  }

  async run(message: Message) {
    if (message.inGuild()) {
      await automod(message);
      messageCommand(message);
    }
  }
}

export default MessageCreateListener;
