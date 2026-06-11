// Enrichissement téléphonique via OpenStreetMap (Overpass API)
// Gratuit, sans clé API, CORS OK. Couverture ~25-40% des PME françaises.

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\b(sarl|sas|sa|eurl|sasu|snc|sci|earl|gaec|sela|ste|sté|societe|compagnie|cie|le|la|les|du|de|des)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.82

  const wordsA = new Set(na.split(' ').filter(w => w.length > 2))
  const wordsB = na.split(' ').filter(w => w.length > 2)
  let matches = 0
  for (const w of wordsB) {
    if ([...wordsA].some(wa => wa === w || wa.startsWith(w.slice(0, 4)) || w.startsWith(wa.slice(0, 4)))) {
      matches++
    }
  }
  return matches / Math.max(wordsA.size, wordsB.length, 1)
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return '+' + digits.slice(2)
  if (digits.startsWith('0')) return '+33' + digits.slice(1)
  return digits
}

interface OsmElement {
  tags: Record<string, string>
}

const osmCache = new Map<string, OsmElement[]>()

async function fetchOsmNodes(dept: string): Promise<OsmElement[]> {
  const key = dept.padStart(2, '0')
  if (osmCache.has(key)) return osmCache.get(key)!

  const isoCode = `FR-${key}`
  const query = `[out:json][timeout:35];area["ISO3166-2"="${isoCode}"]->.d;(node[phone](area.d);way[phone](area.d););out tags;`

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)
  const data = await res.json()

  const nodes: OsmElement[] = (data.elements || []).filter(
    (e: OsmElement) => e.tags?.name && (e.tags?.phone || e.tags?.['contact:phone'])
  )
  osmCache.set(key, nodes)
  return nodes
}

export type EnrichProgress = { done: number; total: number; found: number }

export async function enrichLeadsPhone(
  leads: Array<{ id: string; company_name: string; department: string | null; phone: string | null }>,
  onProgress?: (p: EnrichProgress) => void,
): Promise<Map<string, string>> {
  const toEnrich = leads.filter(l => !l.phone && l.department)
  const result = new Map<string, string>()
  if (!toEnrich.length) return result

  const byDept = new Map<string, typeof toEnrich>()
  for (const lead of toEnrich) {
    const d = lead.department!
    if (!byDept.has(d)) byDept.set(d, [])
    byDept.get(d)!.push(lead)
  }

  let done = 0
  const total = byDept.size

  for (const [dept, deptLeads] of byDept) {
    try {
      const nodes = await fetchOsmNodes(dept)

      for (const lead of deptLeads) {
        let best = 0.54
        let bestPhone: string | null = null

        for (const n of nodes) {
          const score = nameSimilarity(lead.company_name, n.tags.name)
          if (score > best) {
            best = score
            bestPhone = n.tags.phone ?? n.tags['contact:phone'] ?? null
          }
        }

        if (bestPhone) result.set(lead.id, formatPhone(bestPhone))
      }
    } catch { /* Overpass unavailable — skip dept */ }

    done++
    onProgress?.({ done, total, found: result.size })
  }

  return result
}
