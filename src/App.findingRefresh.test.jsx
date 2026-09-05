import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('./useEthscribeWallet', () => ({ useEthscribeWallet: () => ({
  account: '', chainId: '', walletState: 'idle', walletName: '', provider: null,
  connectWallet: vi.fn(), switchToMainnet: vi.fn(), openAccountModal: vi.fn(),
}) }));

// The submission/contract path has its own full component tests. Here the
// child stands in for its successful server-verified publish response so the
// real App polling, Findings merge, and 17-target page can race deterministically.
vi.mock('./EthscribeWorkbench', () => ({ default: function PublishedFindingFixture({ artifact, onFindingPublished }) {
  return <button type="button" onClick={() => onFindingPublished({
    findingId: 'confirmed-sound-finding', expeditionId: artifact.expeditionId, targetId: artifact.id,
    validationMode: 'exact', ethscriptionId: `0x${'87'.repeat(32)}`,
    rawSha256: artifact.sha256, protocolContentSha256: artifact.protocolContentSha256,
    byteLength: artifact.bytes, sourceUrl: artifact.sourceUrl,
  })}>Complete verified Finding publication</button>;
} }));

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  window.history.pushState({}, '', '/');
  vi.restoreAllMocks();
});

test('a stale in-flight feed cannot undo a just-published sound or its 6/17 count; acknowledged server state wins thereafter', async () => {
  let resolveInitialFeed;
  let feedReads = 0;
  let nextRecords = [];
  const feedUrl = '/api/findings?expedition=youve-got-history';
  global.fetch = vi.fn(async (url) => {
    if (url === feedUrl) {
      feedReads += 1;
      if (feedReads === 1) return new Promise(resolve => { resolveInitialFeed = resolve; });
      return { ok: true, json: async () => ({ result: nextRecords }) };
    }
    throw new Error(`No transaction or market call belongs in this refresh test: ${url}`);
  });
  const intervals = vi.spyOn(globalThis, 'setInterval');
  window.history.pushState({}, '', '/expeditions/youve-got-history?artifact=windows-31-ding');
  const { container } = render(<App />);
  expect(await screen.findByText('5 / 17')).toBeInTheDocument();
  await waitFor(() => expect(resolveInitialFeed).toBeDefined());
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: 'SUBMIT A FINDING' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Complete verified Finding publication' }));
  expect(await screen.findByText('6 / 17')).toBeInTheDocument();
  await act(async () => resolveInitialFeed({ ok: true, json: async () => ({ result: [] }) }));
  expect(screen.getByText('6 / 17')).toBeInTheDocument();
  expect(container.querySelector(`audio[src="/api/ethscriptions/media/0x${'87'.repeat(32)}"]`)).toBeInTheDocument();

  const refresh = intervals.mock.calls.find(([, delay]) => delay === 60_000)[0];
  nextRecords = [{
    findingId: 'confirmed-sound-finding', expeditionId: 'youve-got-history', targetId: 'windows-31-ding',
    validationMode: 'exact', ethscriptionId: `0x${'87'.repeat(32)}`,
  }];
  await act(async () => { refresh(); });
  expect(feedReads).toBe(2);
  expect(screen.getByText('6 / 17')).toBeInTheDocument();
  nextRecords = [];
  await act(async () => { refresh(); });
  expect(feedReads).toBe(3);
  expect(screen.getByText('5 / 17')).toBeInTheDocument();
});
