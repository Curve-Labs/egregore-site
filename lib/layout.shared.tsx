import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image src="/logo_egregore.svg" alt="Egregore" width={120} height={28} className="dark:hidden" style={{ height: 28, width: 'auto' }} />
          <Image src="/logo_egregore_light.svg" alt="Egregore" width={120} height={28} className="hidden dark:block" style={{ height: 28, width: 'auto' }} />
        </>
      ),
      url: 'https://egregore.xyz',
    },
    links: [
      {
        text: 'Blog',
        url: 'https://egregore.xyz/blog/teams-forgot-how-to-remember',
      },
      {
        text: 'GitHub',
        url: 'https://github.com/egregore-labs/egregore',
      },
    ],
  };
}
