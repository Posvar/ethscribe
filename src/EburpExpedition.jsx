import { useEffect } from 'react';
import EburpExpeditionPage, { EburpExpeditionCard } from './EburpExpeditionPage';
import { eburpExpedition, eburpStory } from './eburpExpedition';
import './EburpExpedition.css';

// A published, completed collection. Its existing Ethscriptions are unchanged;
// this archive does not reopen submissions or mint replacement artifacts.
export function EburpCard() {
  return <section className="completed-expeditions" aria-labelledby="completed-expeditions-title">
    <div className="completed-expeditions-heading"><div><p>THE ARCHIVE</p><h2 id="completed-expeditions-title">Completed expeditions.</h2></div><p>The search is complete. The history stays open.</p></div>
    <EburpExpeditionCard expedition={eburpExpedition} />
  </section>;
}

export default function EburpExpedition({ renderHeader, footer, renderMarket, renderOwnership }) {
  useEffect(() => { document.title = 'EBURP: Before the Punks — Expedition 000 | ETHSCRI.BE'; }, []);
  return <EburpExpeditionPage expedition={eburpExpedition} story={eburpStory} header={renderHeader(eburpExpedition)} footer={footer} renderMarket={renderMarket} renderOwnership={renderOwnership} localPreview={import.meta.env.DEV} />;
}
