import { host } from '../../../components/host.ts';

/** `--version` で出す内容 */
export interface VersionProps {
  version: string;
  /** 名前も出す場合 (`mycli 0.1.0`) */
  name?: string;
}

/** `--version` の内容 (`version.tsx`) */
export const Version = host<VersionProps>('version', 'Version');
