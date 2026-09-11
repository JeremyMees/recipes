import { describe, expect, it } from 'vitest'
import { fixture } from '~~/test/fixtures/load'
import {
  decodeEntities,
  extractJsonLd,
  findRecipeNode,
  htmlToRecipeDraft,
  parseDuration,
  parseImage,
  parseIngredients,
  parseInstructions,
  parseMetaTags,
  parsePageTitle,
  parseServings,
  parseTags,
  stripHtml,
} from '~~/server/utils/recipe-parser'

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeEntities('Zout &amp; peper')).toBe('Zout & peper')
    expect(decodeEntities('cr&egrave;me')).toBe('crème')
    expect(decodeEntities('&#8364;5')).toBe('€5')
    expect(decodeEntities('&#x2014;')).toBe('—')
  })

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&notanentity;')).toBe('&notanentity;')
  })
})

describe('stripHtml', () => {
  it('removes tags and normalises whitespace', () => {
    expect(stripHtml('<p>Meng   de <b>bloem</b></p>')).toBe('Meng de bloem')
  })

  it('turns block boundaries into newlines', () => {
    expect(stripHtml('<li>Stap een</li><li>Stap twee</li>')).toBe(
      'Stap een\nStap twee',
    )
    expect(stripHtml('Eerst<br>Dan')).toBe('Eerst\nDan')
  })

  it('drops script and style content', () => {
    expect(stripHtml('<style>a{color:red}</style>Tekst')).toBe('Tekst')
  })

  it('returns an empty string for non-strings', () => {
    expect(stripHtml(undefined)).toBe('')
    expect(stripHtml(42)).toBe('')
  })
})

describe('parseDuration', () => {
  it('parses ISO 8601 durations', () => {
    expect(parseDuration('PT30M')).toBe(30)
    expect(parseDuration('PT1H30M')).toBe(90)
    expect(parseDuration('PT0H45M')).toBe(45)
    expect(parseDuration('PT2H')).toBe(120)
    expect(parseDuration('P1DT2H')).toBe(1560)
  })

  it('treats a zero duration as absent', () => {
    expect(parseDuration('PT0H0M')).toBeNull()
    expect(parseDuration('PT0M')).toBeNull()
  })

  it('falls back to human readable durations', () => {
    expect(parseDuration('30 min')).toBe(30)
    expect(parseDuration('1 uur 15 minuten')).toBe(75)
    expect(parseDuration('45')).toBe(45)
  })

  it('accepts plain numbers and rejects nonsense', () => {
    expect(parseDuration(20)).toBe(20)
    expect(parseDuration(0)).toBeNull()
    expect(parseDuration('lekker lang')).toBeNull()
    expect(parseDuration(undefined)).toBeNull()
  })
})

describe('parseServings', () => {
  it('handles the array form used by real sites', () => {
    expect(parseServings(['4', '4 personen'])).toBe(4)
  })

  it('handles numbers, ranges and objects', () => {
    expect(parseServings(6)).toBe(6)
    expect(parseServings('4-6 personen')).toBe(4)
    expect(parseServings({ value: '8' })).toBe(8)
  })

  it('returns null when there is no number', () => {
    expect(parseServings('een flinke pan')).toBeNull()
    expect(parseServings(null)).toBeNull()
    expect(parseServings([])).toBeNull()
  })
})

describe('parseImage', () => {
  it('accepts strings, arrays and ImageObjects', () => {
    expect(parseImage('https://x.test/a.jpg')).toBe('https://x.test/a.jpg')
    expect(parseImage(['https://x.test/a.jpg', 'https://x.test/b.jpg'])).toBe(
      'https://x.test/a.jpg',
    )
    expect(
      parseImage({ '@type': 'ImageObject', url: 'https://x.test/c.jpg' }),
    ).toBe('https://x.test/c.jpg')
    expect(parseImage([{ contentUrl: 'https://x.test/d.jpg' }])).toBe(
      'https://x.test/d.jpg',
    )
  })

  it('rejects relative and missing urls', () => {
    expect(parseImage('/local/a.jpg')).toBeNull()
    expect(parseImage({})).toBeNull()
    expect(parseImage(undefined)).toBeNull()
  })
})

describe('parseIngredients', () => {
  it('normalises strings and objects and splits multiline entries', () => {
    expect(
      parseIngredients([
        '125 gr spek',
        { name: '1 ui' },
        '150 gr wortel\n2 tl zout',
      ]),
    ).toEqual(['125 gr spek', '1 ui', '150 gr wortel', '2 tl zout'])
  })

  it('drops empty entries', () => {
    expect(parseIngredients(['', '  ', '1 ei'])).toEqual(['1 ei'])
    expect(parseIngredients(undefined)).toEqual([])
  })
})

describe('parseInstructions', () => {
  it('splits a plain string on newlines', () => {
    expect(parseInstructions('Stap een\n\nStap twee')).toEqual([
      'Stap een',
      'Stap twee',
    ])
  })

  it('handles HowToStep arrays', () => {
    expect(
      parseInstructions([
        { '@type': 'HowToStep', text: 'Snijd de ui' },
        { '@type': 'HowToStep', name: 'Bak de ui' },
      ]),
    ).toEqual(['Snijd de ui', 'Bak de ui'])
  })

  it('flattens nested HowToSections', () => {
    expect(
      parseInstructions([
        {
          '@type': 'HowToSection',
          name: 'Bereiding',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Kook het water' },
            { '@type': 'HowToStep', text: 'Voeg pasta toe' },
          ],
        },
      ]),
    ).toEqual(['Kook het water', 'Voeg pasta toe'])
  })

  it('returns an empty list for unusable input', () => {
    expect(parseInstructions(undefined)).toEqual([])
    expect(parseInstructions([{}])).toEqual([])
  })
})

describe('extractJsonLd', () => {
  it('reads several blocks and flattens @graph', () => {
    const nodes = extractJsonLd(`
      <script type="application/ld+json">{"@type":"WebSite","name":"Site"}</script>
      <script type="application/ld+json">
        {"@graph":[{"@type":"Recipe","name":"Soep"},{"@type":"Person","name":"Jan"}]}
      </script>
    `)

    expect(nodes.map(node => node['@type'])).toContain('Recipe')
    expect(nodes).toHaveLength(4)
  })

  it('skips malformed json instead of throwing', () => {
    const nodes = extractJsonLd(`
      <script type="application/ld+json">{ not json }</script>
      <script type="application/ld+json">{"@type":"Recipe","name":"Ok"}</script>
    `)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.name).toBe('Ok')
  })

  it('returns nothing when there is no structured data', () => {
    expect(extractJsonLd('<html><body>hoi</body></html>')).toEqual([])
  })
})

describe('findRecipeNode', () => {
  it('matches a string or array @type', () => {
    expect(findRecipeNode([{ '@type': 'Recipe', name: 'A' }])?.name).toBe('A')
    expect(
      findRecipeNode([{ '@type': ['Article', 'Recipe'], name: 'B' }])?.name,
    ).toBe('B')
  })

  it('returns undefined when absent', () => {
    expect(findRecipeNode([{ '@type': 'WebPage' }])).toBeUndefined()
  })
})

describe('parseTags', () => {
  it('merges category, cuisine and keywords and dedupes', () => {
    expect(
      parseTags({
        recipeCategory: 'Hoofdgerecht',
        recipeCuisine: ['Italiaans'],
        keywords: 'pasta, Italiaans, snel',
      }),
    ).toEqual(['hoofdgerecht', 'italiaans', 'pasta', 'snel'])
  })

  it('ignores non-string values', () => {
    expect(parseTags({ keywords: 12, recipeCategory: null })).toEqual([])
  })
})

describe('parseMetaTags and parsePageTitle', () => {
  it('reads meta content regardless of attribute order', () => {
    const meta = parseMetaTags(`
      <meta property="og:title" content="Titel">
      <meta content="Beschrijving" name="og:description">
    `)

    expect(meta['og:title']).toBe('Titel')
    expect(meta['og:description']).toBe('Beschrijving')
  })

  it('reads the document title', () => {
    expect(parsePageTitle('<title>Mijn &amp; recept</title>')).toBe(
      'Mijn & recept',
    )
  })
})

describe('htmlToRecipeDraft', () => {
  it('parses a real leukerecepten.nl page', () => {
    const { draft, source } = htmlToRecipeDraft(
      fixture('leukerecepten.html'),
      'https://www.leukerecepten.nl/recepten/spaghetti-bolognese/',
    )

    expect(source).toBe('jsonld')
    expect(draft.title).toBe('Spaghetti bolognese')
    expect(draft.servings).toBe(4)
    expect(draft.prepMinutes).toBe(45)
    expect(draft.ingredients[0]).toBe('125 gr ontbijtspek in blokjes')
    expect(draft.ingredients.length).toBeGreaterThan(5)
    expect(draft.instructions.length).toBeGreaterThan(3)
    expect(draft.instructions[0]).toMatch(/^Bak de spekjes/)
    expect(draft.imageUrl).toMatch(/^https:\/\//)
    expect(draft.sourceUrl).toContain('leukerecepten.nl')
  })

  it('falls back to open graph metadata', () => {
    const { draft, source } = htmlToRecipeDraft(
      `<html><head>
         <meta property="og:title" content="Geblokkeerd recept">
         <meta property="og:description" content="Korte tekst">
         <meta property="og:image" content="https://x.test/a.jpg">
         <meta property="og:site_name" content="Voorbeeld">
       </head></html>`,
      'https://example.test/recept',
    )

    expect(source).toBe('opengraph')
    expect(draft.title).toBe('Geblokkeerd recept')
    expect(draft.description).toBe('Korte tekst')
    expect(draft.imageUrl).toBe('https://x.test/a.jpg')
    expect(draft.sourceName).toBe('Voorbeeld')
    expect(draft.ingredients).toEqual([])
  })

  it('returns an empty draft with the source url when nothing parses', () => {
    const { draft, source } = htmlToRecipeDraft(
      '<html><body>niets</body></html>',
      'https://www.allrecipes.com/recipe/158140/',
    )

    expect(source).toBe('none')
    expect(draft.title).toBe('')
    expect(draft.sourceUrl).toBe('https://www.allrecipes.com/recipe/158140/')
    expect(draft.sourceName).toBe('allrecipes.com')
  })
})
