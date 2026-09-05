export async function fetchVerifiedFindings(fetchImpl = fetch) {
  const response = await fetchImpl('/api/findings', { headers: { accept: 'application/json' } });
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
      if (!exactByTarget.has(finding.targetId)) exactByTarget.set(finding.targetId, finding);
    });

  return manifestArtifacts.map((artifact) => {
    if (artifact.status === 'secured') return artifact;
    const finding = exactByTarget.get(artifact.id);
    if (!finding) return artifact;
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
      sourceLabel: 'Verified expedition Finding',
      sourceUrl: finding.sourceUrl,
      previewUrl: finding.contentUri,
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
