/** How the screens inside Add credential's own stack close its modal. */

import { createContext, useContext } from 'react';

export const AddCredentialContext = createContext<{ close: () => void }>({
  close: () => {},
});

export function useAddCredential(): { close: () => void } {
  return useContext(AddCredentialContext);
}
