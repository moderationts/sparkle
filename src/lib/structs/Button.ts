import { ButtonInteraction } from 'discord.js';
import client from '../../client';

abstract class Button {
  public readonly name: string;
  public client = client;

  constructor(name: string) {
    this.name = name;
  }

  abstract run(interaction: ButtonInteraction, ...args: any[]): unknown;
}

export default Button;
