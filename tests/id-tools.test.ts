import { describe, expect, it } from 'vitest';
import { extractAssetId } from '../src/features/marketplace/copy-asset-id';
import { extractCommunityId } from '../src/features/communities/copy-community-id';
import { extractPlaceId } from '../src/features/experiences/copy-place-id';
import { extractUniverseId } from '../src/features/experiences/copy-universe-id';
import { extractUserId } from '../src/features/profile/copy-user-id';

describe('verified page ID extractors', () => {
  it('recognizes Creator Store and legacy asset URLs', () => {
    expect(extractAssetId('/store/asset/148548')).toBe('148548');
    expect(extractAssetId('/catalog/123/item')).toBe('123');
    expect(extractAssetId('/store/bundle/148548')).toBeNull();
  });

  it('separates place and universe IDs on Creator Hub routes', () => {
    const path = '/dashboard/creations/experiences/1000/places/2000/configure';
    expect(extractUniverseId(path, new URLSearchParams())).toBe('1000');
    expect(extractPlaceId(path)).toBe('2000');
    expect(extractPlaceId('/games/3000/example')).toBe('3000');
  });

  it('recognizes profile and community identifiers only in declared positions', () => {
    expect(extractUserId('/users/1/profile')).toBe('1');
    expect(extractUserId('/users/not-a-number/profile')).toBeNull();
    expect(extractCommunityId('/communities/42/example', new URLSearchParams())).toBe('42');
    expect(extractCommunityId('/communities/configure', new URLSearchParams('id=99'))).toBe('99');
  });
});
