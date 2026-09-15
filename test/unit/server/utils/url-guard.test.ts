import { describe, expect, it } from 'vitest'
import { isFetchableUrl, isSocialUrl } from '~~/server/utils/url-guard'

describe('isFetchableUrl', () => {
  it('allows public http and https hosts', () => {
    expect(isFetchableUrl('https://www.leukerecepten.nl/x')).toBe(true)
    expect(isFetchableUrl('http://24kitchen.nl/x')).toBe(true)
  })

  it('blocks loopback, link-local and private ranges', () => {
    const blocked = [
      'http://localhost:3000/x',
      'http://127.0.0.1/x',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://169.254.169.254/latest/meta-data',
      'http://172.16.0.1/x',
      'http://172.31.255.255/x',
    ]

    for (const url of blocked) {
      expect(isFetchableUrl(url), url).toBe(false)
    }
  })

  it('blocks other protocols and unparseable input', () => {
    expect(isFetchableUrl('file:///etc/passwd')).toBe(false)
    expect(isFetchableUrl('javascript:alert(1)')).toBe(false)
    expect(isFetchableUrl('geen url')).toBe(false)
  })
})

describe('isSocialUrl', () => {
  it('recognises instagram, facebook and tiktok links', () => {
    const social = [
      'https://www.instagram.com/p/Cabc123/',
      'https://instagram.com/reel/Cabc123/',
      'https://www.facebook.com/share/p/abc/',
      'https://m.facebook.com/story.php?id=1',
      'https://fb.watch/abc/',
      'https://www.tiktok.com/@chef/video/123',
    ]

    for (const url of social) {
      expect(isSocialUrl(url), url).toBe(true)
    }
  })

  it('leaves recipe sites and lookalike hosts alone', () => {
    expect(isSocialUrl('https://www.leukerecepten.nl/x')).toBe(false)
    expect(isSocialUrl('https://notinstagram.com/p/x')).toBe(false)
    expect(isSocialUrl('https://instagram.com.evil.test/p/x')).toBe(false)
    expect(isSocialUrl('geen url')).toBe(false)
  })
})
