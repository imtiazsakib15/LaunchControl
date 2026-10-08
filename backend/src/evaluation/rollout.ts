const UINT32_MAX = 0xffffffff;

export function murmur3_32(input: string, seed = 0): number {
  const bytes = new TextEncoder().encode(input);

  let hash = seed >>> 0;

  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;

  const blockCount = Math.floor(bytes.length / 4);

  for (let i = 0; i < blockCount; i += 1) {
    const offset = i * 4;

    let k =
      bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24);

    k = Math.imul(k, c1);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, c2);

    hash ^= k;

    hash = (hash << 13) | (hash >>> 19);
    hash = (Math.imul(hash, 5) + 0xe6546b64) | 0;
  }

  let k1 = 0;
  const tailOffset = blockCount * 4;

  switch (bytes.length & 3) {
    case 3:
      k1 ^= bytes[tailOffset + 2] << 16;
    // falls through

    case 2:
      k1 ^= bytes[tailOffset + 1] << 8;
    // falls through

    case 1:
      k1 ^= bytes[tailOffset];
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      hash ^= k1;
  }

  hash ^= bytes.length;

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

export function getRolloutBucket(flagKey: string, userKey: string): number {
  const input = `${flagKey}:${userKey}`;

  return murmur3_32(input) % 100;
}

export function isInRollout(
  flagKey: string,
  userKey: string,
  rolloutPercentage: number,
): boolean {
  if (rolloutPercentage <= 0) {
    return false;
  }

  if (rolloutPercentage >= 100) {
    return true;
  }

  const bucket = getRolloutBucket(flagKey, userKey);

  return bucket < rolloutPercentage;
}
