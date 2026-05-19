import { Command } from 'commander';
import { loginCommand } from './login';
import { logoutCommand } from './logout';
import { statusCommand } from './status';
import { tokenCommand } from './token';
import { profilesCommand } from './profiles';

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Manage authentication and credentials');
  loginCommand(auth);
  logoutCommand(auth);
  statusCommand(auth);
  tokenCommand(auth);
  profilesCommand(auth);
}
