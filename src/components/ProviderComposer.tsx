import type { FC, ReactNode } from 'react';

interface ProviderComposerProps {
  providers: FC<{ children: ReactNode }>[];
  children: ReactNode;
}

export const ProviderComposer: FC<ProviderComposerProps> = ({ providers, children }) => {
  return (
    <>
      {providers.reduceRight(
        (acc, Provider) => <Provider>{acc}</Provider>,
        children
      )}
    </>
  );
};
