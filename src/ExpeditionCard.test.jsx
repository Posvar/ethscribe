import { render, screen, within } from '@testing-library/react';
import ExpeditionCard from './ExpeditionCard';

test('expedition cards share headings, status, metadata and navigation structure', () => {
  const common = { era: '1992–2000', description: 'Recover original files.', recognized: 5, total: 17, visual: <span>Visual</span> };
  render(<><ExpeditionCard {...common} number="002" title="Sound hunt" path="/expeditions/youve-got-history" /><ExpeditionCard {...common} number="001" title="Satoshi hunt" path="/expeditions/lost-pixels-of-satoshi" lost={1} /></>);
  for (const number of ['002', '001']) {
    const card = screen.getByRole('region', { name: `Expedition ${number}` });
    expect(within(card).getByText(`LIVE NOW / EXPEDITION ${number}`)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: `Enter Expedition ${number}` })).toHaveClass('expedition-index-card');
    expect(within(card).getByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(within(card).getByText('ACTIVE')).toBeInTheDocument();
    expect(within(card).getByText('5 / 17')).toBeInTheDocument();
    expect(within(card).getByText('12')).toBeInTheDocument();
  }
});
