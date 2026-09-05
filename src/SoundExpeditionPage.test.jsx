import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import SoundExpeditionPage, { SoundExpeditionCard } from './SoundExpeditionPage';
import { soundExpedition } from './soundExpedition';

const linkedId = `0x${'a'.repeat(64)}`;
const sha256 = '1'.repeat(64);
const secondSha = '2'.repeat(64);
const expedition = {
  id: '002', slug: 'you-had-to-be-there', title: 'You Had to Be There',
  subtitle: 'The sounds that made the early internet feel alive.',
  intro: 'Return to the small files that announced a bigger world.',
  scopeNote: 'These reference files belong to the specific releases named below.',
  targets: [
    { id: 'hello', title: 'A familiar hello', fileName: 'HELLO.WAV', release: 'Example Client 1.0', year: '1995', bytes: 10004, sha256, format: 'PCM WAV', sampleRate: 22050, channels: 1, bitsPerSample: 8, durationSeconds: 0.451, sourceLabel: 'Preserved installation disc', sourceUrl: 'https://example.org/source', sourcePath: 'SETUP/SOUNDS/HELLO.WAV', provenanceNote: 'Extracted from the preserved source package without conversion.' },
    { id: 'goodbye', title: 'One last goodbye', fileName: 'GOODBYE.WAV', release: 'Example Client 1.0', year: '1995', bytes: 20044, sha256: secondSha, format: 'PCM WAV', sampleRate: 11025, channels: 2, bitsPerSample: 16, durationSeconds: 1.21, sourceLabel: 'Preserved installation disc', sourceUrl: 'https://example.org/source', sourcePath: 'SETUP/SOUNDS/GOODBYE.WAV', provenanceNote: 'A second complete source file.', ethscriptionId: linkedId },
  ],
  sources: [{ title: 'Installation disc archive', url: 'https://example.org/archive', note: 'The release-specific source record.' }],
};

beforeEach(() => { window.history.replaceState({}, '', '/expeditions/you-had-to-be-there'); });
afterEach(() => { window.history.replaceState({}, '', '/'); });

test('renders an active hunt with accurate recognition and open-target states', () => {
  const { container } = render(<SoundExpeditionPage expedition={expedition} header={<header>Site header</header>} footer={<footer>Site footer</footer>} />);
  expect(screen.getByRole('heading', { level: 1, name: expedition.title })).toBeInTheDocument();
  expect(screen.getByText(/active hunt · expedition 002/i)).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
  expect(container.querySelector('.sound-target-state.sound-state-recognized')).toHaveTextContent('ETHSCRIBED');
  expect(screen.getByText('OPEN TARGET')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Example Client 1.0' })).toBeInTheDocument();
  expect(screen.getByText('2 reference files')).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  expect(screen.getByRole('banner')).toHaveTextContent('Site header');
  expect(screen.getByRole('contentinfo')).toHaveTextContent('Site footer');
  expect(screen.queryByRole('button', { name: /^(?:deposit|ethscribe|submit|pay)(?:\s|$)/i })).not.toBeInTheDocument();
  expect(container.querySelector('input[type=file]')).not.toBeInTheDocument();
  expect(container.querySelector('img')).not.toBeInTheDocument();
});

test('opens exact file metadata and the untruncated hash with source provenance', () => {
  render(<SoundExpeditionPage expedition={expedition} />);
  const button = screen.getByRole('button', { name: 'A familiar hello' });
  fireEvent.click(button);
  const region = screen.getByRole('region', { name: 'A familiar hello' });
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(region).toHaveAttribute('id', button.getAttribute('aria-controls'));
  expect(within(region).getByText(sha256)).toBeInTheDocument();
  expect(within(region).getByText('10,004 bytes')).toBeInTheDocument();
  expect(within(region).getByText('22,050 Hz')).toBeInTheDocument();
  expect(within(region).getByText('Mono · 8-bit')).toBeInTheDocument();
  expect(within(region).getByText('SETUP/SOUNDS/HELLO.WAV')).toBeInTheDocument();
  expect(within(region).getByRole('link', { name: /inspect the source record/i })).toHaveAttribute('href', 'https://example.org/source');
  expect(within(region).getByText(/converting, trimming, or re-encoding/i)).toBeInTheDocument();
  expect(within(region).getByRole('heading', { name: 'A familiar hello' })).toHaveFocus();
});

test('supports single-record expansion, Escape and returning keyboard focus', () => {
  render(<SoundExpeditionPage expedition={expedition} />);
  fireEvent.click(screen.getByRole('button', { name: 'A familiar hello' }));
  fireEvent.click(screen.getByRole('button', { name: 'One last goodbye' }));
  expect(screen.queryByRole('region', { name: 'A familiar hello' })).not.toBeInTheDocument();
  const record = screen.getByRole('region', { name: 'One last goodbye' });
  expect(within(record).getByText('Stereo · 16-bit')).toBeInTheDocument();
  fireEvent.keyDown(within(record).getByRole('heading', { name: 'One last goodbye' }), { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'One last goodbye' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'One last goodbye' })).toHaveFocus();
  expect(screen.getByRole('button', { name: 'One last goodbye' })).toHaveAttribute('aria-expanded', 'false');
});

test('only enables native audio for a linked Ethscription and never autoplays or preloads it', () => {
  const { container } = render(<SoundExpeditionPage expedition={expedition} />);
  const audio = container.querySelectorAll('audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]).toHaveAttribute('src', `/api/ethscriptions/media/${linkedId}`);
  expect(audio[0]).toHaveAttribute('preload', 'none');
  expect(audio[0]).toHaveAttribute('controls');
  expect(audio[0]).not.toHaveAttribute('autoplay');
  expect(audio[0]).toHaveAccessibleName('Listen to One last goodbye');
  expect(screen.getByText('Audio preview sealed')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
});

test('malformed or absent Ethscription IDs cannot produce speculative audio URLs', () => {
  const { container } = render(<SoundExpeditionPage expedition={{ ...expedition, targets: expedition.targets.map(target => ({ ...target, ethscriptionId: 'not-an-id' })) }} />);
  expect(container.querySelector('audio')).not.toBeInTheDocument();
  expect(screen.getAllByText('Audio preview sealed')).toHaveLength(2);
});

test('resets an expanded record for another expedition and groups distinct releases', () => {
  const { rerender } = render(<SoundExpeditionPage expedition={expedition} />);
  fireEvent.click(screen.getByRole('button', { name: 'A familiar hello' }));
  window.history.replaceState({}, '', '/expeditions/another-expedition');
  rerender(<SoundExpeditionPage expedition={{ ...expedition, id: '003', targets: expedition.targets.map((target, index) => ({ ...target, release: index === 1 ? 'Another release' : target.release })) }} />);
  expect(screen.queryByRole('region', { name: 'A familiar hello' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Another release' })).toBeInTheDocument();
});

test('opening records does not call an API or request a wallet', () => {
  const spy = vi.spyOn(global, 'fetch');
  try {
    render(<SoundExpeditionPage expedition={expedition} />);
    fireEvent.click(screen.getByRole('button', { name: 'A familiar hello' }));
    fireEvent.click(screen.getByRole('button', { name: /close record/i }));
    expect(spy).not.toHaveBeenCalled();
  } finally { spy.mockRestore(); }
});

test('the active directory card shows live recognition counts and an expedition entry', () => {
  render(<SoundExpeditionCard expedition={expedition} />);
  expect(screen.getByRole('heading', { name: expedition.title })).toBeInTheDocument();
  expect(screen.getByText(/2 exact-file targets/i)).toBeInTheDocument();
  expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Enter Expedition 002' })).toHaveAttribute('href', '/expeditions/you-had-to-be-there');
});

test('a missing target keeps the shared Finding flow collapsed until requested', () => {
  const onFindingPublished = vi.fn();
  const published = { findingId: 'test-finding', expeditionId: expedition.slug };
  const renderSubmission = vi.fn(({ artifact, onClose, onFindingPublished: publish }) => <div><p>Shared workflow for {artifact.id}</p><button type="button" onClick={() => publish(published)}>Finish Finding</button><button type="button" onClick={onClose}>Cancel Finding</button></div>);
  render(<SoundExpeditionPage expedition={expedition} renderSubmission={renderSubmission} onFindingPublished={onFindingPublished} />);
  fireEvent.click(screen.getByRole('button', { name: 'A familiar hello' }));
  expect(renderSubmission).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'SUBMIT A FINDING' }));
  expect(screen.getByText('Shared workflow for hello')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Finish Finding' }));
  expect(onFindingPublished).toHaveBeenCalledWith(published);
  expect(screen.queryByText('Shared workflow for hello')).not.toBeInTheDocument();
});

test('a recognized record uses marketplace controls instead of the Finding launcher', () => {
  const renderMarket = vi.fn(({ artifact }) => <div>Market for {artifact.ethscriptionId}</div>);
  const renderSubmission = vi.fn(() => <div>Unexpected workflow</div>);
  render(<SoundExpeditionPage expedition={expedition} renderMarket={renderMarket} renderSubmission={renderSubmission} />);
  fireEvent.click(screen.getByRole('button', { name: 'One last goodbye' }));
  expect(screen.getByText(`Market for ${linkedId}`)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'SUBMIT A FINDING' })).not.toBeInTheDocument();
  expect(renderSubmission).not.toHaveBeenCalled();
});

test('deep links open the exact sound record and closing clears only its target location', () => {
  window.history.replaceState({}, '', '/expeditions/you-had-to-be-there?artifact=hello&view=all#record-hello');
  render(<SoundExpeditionPage expedition={expedition} />);
  expect(screen.getByRole('region', { name: 'A familiar hello' })).toHaveAttribute('id', 'record-hello');
  fireEvent.click(screen.getByRole('button', { name: 'Close record' }));
  expect(window.location.search).toBe('?view=all');
  expect(window.location.hash).toBe('');
});

test('failed Finding refreshes distinguish a recorded match from a live index', () => {
  render(<SoundExpeditionPage expedition={expedition} findingIndexState="error" />);
  expect(screen.getByText(/live findings are temporarily unavailable/i)).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

test('the hero completion grid includes all 17 numbered target slots and no media playback', () => {
  render(<SoundExpeditionPage expedition={soundExpedition} />);
  const grid = screen.getByRole('group', { name: 'Expedition completion grid' });
  expect(within(grid).getAllByRole('button')).toHaveLength(17);
  expect(grid.querySelectorAll('.sound-completion-recognized')).toHaveLength(5);
  expect(grid.querySelectorAll('.sound-completion-slot:not(.sound-completion-recognized)')).toHaveLength(12);
  expect(within(grid).getByText('01')).toBeInTheDocument();
  expect(within(grid).getByText('17')).toBeInTheDocument();
  expect(grid.querySelector('audio')).not.toBeInTheDocument();
  expect(grid.querySelector('img')).not.toBeInTheDocument();
  soundExpedition.targets.forEach(target => expect(within(grid).getByRole('button', { name: `Open ${target.title}, ${target.fileName}, ${target.ethscriptionId ? 'Ethscribed' : 'open target'}` })).toBeInTheDocument());
});

test('a completion slot opens its exact record and closing returns focus to that slot', () => {
  render(<SoundExpeditionPage expedition={expedition} />);
  const grid = screen.getByRole('group', { name: 'Expedition completion grid' });
  const slot = within(grid).getByRole('button', { name: 'Open A familiar hello, HELLO.WAV, open target' });
  fireEvent.click(slot);
  expect(screen.getByRole('region', { name: 'A familiar hello' })).toHaveAttribute('id', 'record-hello');
  expect(slot).toHaveAttribute('aria-expanded', 'true');
  expect(window.location.search).toBe('?artifact=hello');
  expect(window.location.hash).toBe('#record-hello');
  const heading = within(screen.getByRole('region', { name: 'A familiar hello' })).getByRole('heading', { name: 'A familiar hello' });
  expect(heading).toHaveFocus();
  fireEvent.keyDown(heading, { key: 'Escape' });
  expect(slot).toHaveFocus();
  expect(slot).toHaveAttribute('aria-expanded', 'false');
});

test('a new recognized Finding updates the completion slot, count, and corresponding audio together', () => {
  const { rerender, container } = render(<SoundExpeditionPage expedition={expedition} />);
  const grid = screen.getByRole('group', { name: 'Expedition completion grid' });
  expect(grid.querySelectorAll('.sound-completion-recognized')).toHaveLength(1);
  const targets = expedition.targets.map(target => target.id === 'hello' ? { ...target, ethscriptionId: `0x${'b'.repeat(64)}`, status: 'secured' } : target);
  rerender(<SoundExpeditionPage expedition={{ ...expedition, targets }} />);
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
  expect(grid.querySelectorAll('.sound-completion-recognized')).toHaveLength(2);
  expect(container.querySelectorAll('audio')).toHaveLength(2);
  expect(within(grid).getByRole('button', { name: 'Open A familiar hello, HELLO.WAV, Ethscribed' })).toHaveClass('sound-completion-recognized');
});
