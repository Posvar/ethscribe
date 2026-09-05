const DEFAULT_EXPEDITION_ID = 'lost-pixels-of-satoshi';
const PUBLISHED_FINDING_GRACE_MS = 3 * 60_000;

export function retainPublishedFinding(pending, finding, now = Date.now()) {
  if (!finding?.findingId) return;
  const expeditionId = finding.expeditionId || DEFAULT_EXPEDITION_ID;
  pending.set(`${expeditionId}:${finding.findingId}`, { finding, receivedAt: now });
}

export function reconcileFindingSnapshot(records, pending, expeditionId = DEFAULT_EXPEDITION_ID, now = Date.now()) {
  const acknowledged = new Set(records
    .filter(record => (record.expeditionId || DEFAULT_EXPEDITION_ID) === expeditionId)
    .map(record => record.findingId));
  const retained = [];
  for (const [key, { finding, receivedAt }] of pending) {
    if ((finding.expeditionId || DEFAULT_EXPEDITION_ID) !== expeditionId) continue;
    // Only a successfully published server result is retained across a stale
    // index response. Once observed in the feed, subsequent server removals
    // are authoritative. The bound also prevents indefinite local assertions.
    if (acknowledged.has(finding.findingId) || now - receivedAt >= PUBLISHED_FINDING_GRACE_MS) {
      pending.delete(key);
    } else retained.push(finding);
  }
  return [...retained, ...records];
}

export async function fetchVerifiedFindings(fetchImpl = fetch, expeditionId = DEFAULT_EXPEDITION_ID) {
  const response = await fetchImpl(`/api/findings?expedition=${encodeURIComponent(expeditionId)}`, { headers: { accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.result)) throw new Error(payload.message || 'The verified Finding index is temporarily unavailable.');
  return payload.result;
}

function findingTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function mergeVerifiedFindings(manifestArtifacts, findings) {
  const exactByTarget = new Map();
  [...(findings || [])]
    .filter((finding) => finding?.validationMode === 'exact' && finding.targetId && finding.ethscriptionId)
    .sort((left, right) => findingTimestamp(left.verifiedAt) - findingTimestamp(right.verifiedAt))
    .forEach((finding) => {
      const key = `${finding.expeditionId || DEFAULT_EXPEDITION_ID}:${finding.targetId}`;
      if (!exactByTarget.has(key)) exactByTarget.set(key, finding);
    });

  return manifestArtifacts.map((artifact) => {
    if (artifact.status === 'secured') return artifact;
    const finding = exactByTarget.get(`${artifact.expeditionId || DEFAULT_EXPEDITION_ID}:${artifact.id}`);
    if (!finding) return artifact;
    const preserveReference = artifact.expeditionId && artifact.expeditionId !== DEFAULT_EXPEDITION_ID;
    return {
      ...artifact,
      status: 'secured',
      findingId: finding.findingId,
      ethscriptionId: finding.ethscriptionId,
      sha256: finding.rawSha256,
      contentSha: finding.protocolContentSha256,
      bytes: finding.byteLength,
      creator: finding.ethscriptionCreator || '',
      findingAuthor: finding.authorAddress,
      findingVerifiedAt: finding.verifiedAt || null,
      ethscriptionNumber: finding.ethscriptionNumber ?? null,
      sourceLabel: preserveReference ? artifact.sourceLabel : 'Verified expedition Finding',
      sourceUrl: preserveReference ? artifact.sourceUrl : (finding.sourceUrl || artifact.sourceUrl),
      findingSourceUrl: finding.sourceUrl || null,
      previewUrl: finding.contentUri || artifact.previewUrl,
      ethscribedAt: Number(finding.ethscriptionTimestamp) > 0
        ? `${new Date(Number(finding.ethscriptionTimestamp) * 1000).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).toUpperCase()} UTC`
        : null,
    };
  });
}

export function statsForArtifacts(resolvedArtifacts, baseStats) {
  const secured = resolvedArtifacts.filter((artifact) => artifact.status === 'secured').length;
  return {
    ...baseStats,
    known: resolvedArtifacts.length,
    secured,
    open: resolvedArtifacts.length - secured,
  };
}
