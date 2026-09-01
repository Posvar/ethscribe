import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit';
import { useCallback, useMemo } from 'react';
import { useAccount, useEnsAddress, useEnsName, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createWalletProvider, toHexChainId } from './walletProvider';

export function useEthscribeWallet() {
  const { address, chainId: connectedChainId, connector, status } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const { data: reverseEnsName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: Boolean(address) },
  });
  const { data: forwardEnsAddress } = useEnsAddress({
    name: reverseEnsName || undefined,
    chainId: mainnet.id,
    query: { enabled: Boolean(reverseEnsName) },
  });
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();

  const provider = useMemo(
    () => createWalletProvider(walletClient, publicClient),
    [publicClient, walletClient],
  );
  const ensName = reverseEnsName
    && forwardEnsAddress?.toLowerCase() === address?.toLowerCase()
    ? reverseEnsName
    : '';

  const connectWallet = useCallback(async () => {
    openConnectModal?.();
    return '';
  }, [openConnectModal]);

  const switchToMainnet = useCallback(async () => {
    await switchChainAsync({ chainId: mainnet.id });
  }, [switchChainAsync]);

  return {
    account: address || '',
    chainId: toHexChainId(connectedChainId),
    walletState: status === 'connecting' ? 'connecting' : 'idle',
    walletName: connector?.name || '',
    ensName,
    provider,
    connectWallet,
    switchToMainnet,
    openAccountModal,
  };
}
