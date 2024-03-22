import { GuildMember } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { PunishmentType } from '../lib/util/constants';

class GuildMemberUpdateListener extends Listener {
  constructor() {
    super('guildMemberUpdate');
  }

  async run(oldMember: GuildMember, newMember: GuildMember) {
    if (oldMember.isCommunicationDisabled() && !newMember.isCommunicationDisabled()) {
      await this.client.db.task
        .delete({
          where: {
            userId_guildId_type: {
              guildId: newMember.guild.id,
              userId: newMember.id,
              type: PunishmentType.Mute
            }
          }
        })
        .catch(() => {});
    }
  }
}

export default GuildMemberUpdateListener;
