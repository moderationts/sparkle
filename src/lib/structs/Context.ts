import { ContextMenuCommandBuilder, ContextMenuCommandInteraction, If, PermissionsBitField } from 'discord.js';
import client from '../../client';
import { ConfigData } from './Interfaces';

export default abstract class CtxMenu<IsMsg extends boolean = true> {
  public readonly data: IsMsg extends true ? Partial<ContextMenuCommandBuilder> : null = null!;
  public clientPermissions: PermissionsBitField | null = null;
  public userPermissions: PermissionsBitField | null = null;

  public id: If<IsMsg, null, string> = null!;

  public client = client;

  abstract run(interaction: ContextMenuCommandInteraction, config?: ConfigData): unknown;
}

export function ctxdata(data: Partial<ContextMenuCommandBuilder>) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      data = data;
    };
  };
}
