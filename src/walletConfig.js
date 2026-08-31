import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

// WalletConnect project IDs are public client identifiers, not secrets. Reuse
// the established ittybits project until Ethscribe receives its own Reown ID.
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID
  || 'e6f036020f7fc1239b51991cdc88a465';

const rpcUrl = process.env.REACT_APP_ETHEREUM_RPC_URL
  || 'https://ethereum-rpc.publicnode.com';

export const walletConfig = getDefaultConfig({
  appName: 'Ethscribe',
  projectId,
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(rpcUrl),
  },
});
