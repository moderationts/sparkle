import { GuildBan } from 'discord.js';
import Listener from '../lib/structs/Listener';
import { PunishmentType } from '../lib/util/constants';

class GuildBanRemoveListener extends Listener {
  constructor() {
    super('guildBanRemove');
  }

  async run(ban: GuildBan) {
    await this.client.db.task
      .delete({
        where: {
          userId_guildId_type: {
            guildId: ban.guild.id,
            userId: ban.user.id,
            type: PunishmentType.Ban
          }
        }
      })
      .catch(() => {});
  }
}

export default GuildBanRemoveListener;
