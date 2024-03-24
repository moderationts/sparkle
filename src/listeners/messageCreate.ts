import { Message } from 'discord.js';
import Listener from '../lib/structs/Listener';
import messageCommand from '../handlers/messageCommand';
import automod from '../handlers/automod';
import convertMedia from '../handlers/convertMedia';

class MessageCreateListener extends Listener {
  constructor() {
    super('messageCreate');
  }

  async run(message: Message) {
    if (message.inGuild()) {
      await automod(message);
      await messageCommand(message);
      convertMedia(message);
    }
  }
}

export default MessageCreateListener;
