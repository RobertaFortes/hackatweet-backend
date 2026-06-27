const { extractHashtags } = require('../utils/hashtags');

describe('extractHashtags', () => {
  it('extracts multiple hashtags', () => {
    expect(extractHashtags('learning #js and #node')).toEqual(['js', 'node']);
  });

  it('normalizes hashtags to lowercase', () => {
    expect(extractHashtags('#JavaScript #NODE')).toEqual(['javascript', 'node']);
  });

  it('removes duplicate hashtags (case-insensitive)', () => {
    expect(extractHashtags('#WORLD #world hello #World')).toEqual(['world']);
  });

  it('returns an empty array when there are no hashtags', () => {
    expect(extractHashtags('just a plain tweet')).toEqual([]);
  });

  it('ignores a lone # with no word', () => {
    expect(extractHashtags('a # b #real')).toEqual(['real']);
  });
});
