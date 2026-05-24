import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { Invoice } from '../../types'

const C = {
  deep:   '#0F2008',
  mid:    '#2D5A1B',
  ocre:   '#B87520',
  cream:  '#F9F6F0',
  border: '#E4DDD4',
  muted:  '#5A5A5A',
  white:  '#FFFFFF',
  text:   '#1A1A1A',
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(s: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(s))
  } catch {
    return s
  }
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    backgroundColor: C.white,
    paddingTop: 48,
    paddingBottom: 64,
    paddingLeft: 48,
    paddingRight: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  brandName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: C.deep,
  },
  brandTag: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.2,
    marginTop: 3,
  },
  agencyLine: {
    fontSize: 9,
    color: C.muted,
    textAlign: 'right',
    lineHeight: 1.7,
  },
  titleBar: {
    backgroundColor: C.deep,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: C.white,
    letterSpacing: 1,
  },
  titleNum: {
    fontSize: 10,
    color: C.white,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  metaBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
    marginRight: 10,
  },
  metaBoxLast: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 9.5,
    color: C.text,
    lineHeight: 1.5,
  },
  metaMuted: {
    fontSize: 9,
    color: C.muted,
    lineHeight: 1.5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.mid,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.cream,
  },
  thCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.white,
  },
  tdCell: {
    fontSize: 9.5,
    color: C.text,
  },
  tdBold: {
    fontFamily: 'Helvetica-Bold',
  },
  colDesc:  { flex: 4 },
  colQty:   { flex: 1, textAlign: 'right' },
  colUnit:  { flex: 2, textAlign: 'right' },
  colTotal: { flex: 2, textAlign: 'right' },
  totalsWrap: {
    alignSelf: 'flex-end',
    width: 220,
    marginTop: 8,
    marginBottom: 24,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 4,
  },
  totalLabel: { fontSize: 9, color: C.muted },
  totalValue: { fontSize: 9, color: C.text },
  divider: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 2,
    marginBottom: 2,
  },
  totalTtcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.deep,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  totalTtcLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.white,
  },
  totalTtcValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: C.ocre,
  },
  notesWrap: {
    borderLeftWidth: 2,
    borderLeftColor: C.ocre,
    paddingLeft: 10,
    marginBottom: 16,
  },
  notesLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 9,
    color: C.muted,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: C.muted },
})

export interface InvoicePDFProps {
  invoice: Invoice
}

type RawLineItem = {
  id?: string
  description: string
  quantity: number
  unit_price: number
  total?: number
}

const STATUS_LABELS: Record<string, string> = {
  brouillon:  'Brouillon',
  envoye:     'Envoyé',
  en_attente: 'En attente',
  paye:       'Payé',
  en_retard:  'En retard',
  annule:     'Annulé',
}

export default function InvoicePDF({ invoice }: InvoicePDFProps) {
  const isDevis = invoice.type === 'devis'
  const ht   = invoice.amount_ht ?? 0
  const rate = invoice.tva_rate ?? 20
  const tva  = ht * (rate / 100)
  const ttc  = invoice.amount_ttc ?? (ht + tva)
  const items = (invoice.line_items as unknown as RawLineItem[]) ?? []

  return (
    <Document
      title={`${isDevis ? 'Devis' : 'Facture'} ${invoice.number}`}
      author="Fourmiliance"
      creator="Fourmiliance Hub"
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>Fourmiliance</Text>
            <Text style={s.brandTag}>AGENCE WEB &amp; IA</Text>
          </View>
          <View>
            <Text style={s.agencyLine}>Perpignan (66000)</Text>
            <Text style={s.agencyLine}>contact@fourmiliance.fr</Text>
            <Text style={s.agencyLine}>fourmiliance.fr</Text>
          </View>
        </View>

        {/* ── Title bar ── */}
        <View style={s.titleBar}>
          <Text style={s.titleText}>{isDevis ? 'DEVIS' : 'FACTURE'}</Text>
          <Text style={s.titleNum}>{invoice.number}</Text>
        </View>

        {/* ── Meta ── */}
        <View style={s.metaRow}>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Client</Text>
            <Text style={s.metaValue}>{invoice.contact?.company ?? '—'}</Text>
            {invoice.contact?.contact_name ? (
              <Text style={s.metaMuted}>{invoice.contact.contact_name}</Text>
            ) : null}
          </View>

          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Date d'émission</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.issued_date)}</Text>
            {invoice.due_date ? (
              <>
                <Text style={[s.metaLabel, { marginTop: 6 }]}>Échéance</Text>
                <Text style={s.metaValue}>{fmtDate(invoice.due_date)}</Text>
              </>
            ) : null}
          </View>

          <View style={s.metaBoxLast}>
            <Text style={s.metaLabel}>Référence</Text>
            <Text style={s.metaValue}>{invoice.number}</Text>
            <Text style={[s.metaLabel, { marginTop: 6 }]}>Statut</Text>
            <Text style={s.metaValue}>
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </Text>
          </View>
        </View>

        {/* ── Table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.thCell, s.colDesc]}>Désignation</Text>
          <Text style={[s.thCell, s.colQty]}>Qté</Text>
          <Text style={[s.thCell, s.colUnit]}>PU HT</Text>
          <Text style={[s.thCell, s.colTotal]}>Total HT</Text>
        </View>

        {items.length === 0 ? (
          <View style={s.tableRow}>
            <Text style={[s.tdCell, s.colDesc, { color: '#9A9A9A' }]}>Aucune ligne saisie</Text>
            <Text style={[s.tdCell, s.colQty]}>—</Text>
            <Text style={[s.tdCell, s.colUnit]}>—</Text>
            <Text style={[s.tdCell, s.colTotal]}>—</Text>
          </View>
        ) : (
          items.map((item, idx) => (
            <View
              key={item.id ?? String(idx)}
              style={idx % 2 === 1 ? [s.tableRow, s.tableRowAlt] : s.tableRow}
            >
              <Text style={[s.tdCell, s.colDesc]}>{item.description}</Text>
              <Text style={[s.tdCell, s.colQty]}>{item.quantity}</Text>
              <Text style={[s.tdCell, s.colUnit]}>{fmt(item.unit_price)}</Text>
              <Text style={[s.tdCell, s.colTotal, s.tdBold]}>
                {fmt(item.total ?? item.quantity * item.unit_price)}
              </Text>
            </View>
          ))
        )}

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalLine}>
            <Text style={s.totalLabel}>Sous-total HT</Text>
            <Text style={s.totalValue}>{fmt(ht)}</Text>
          </View>
          <View style={s.totalLine}>
            <Text style={s.totalLabel}>TVA {rate} %</Text>
            <Text style={s.totalValue}>{fmt(tva)}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.totalTtcRow}>
            <Text style={s.totalTtcLabel}>Total TTC</Text>
            <Text style={s.totalTtcValue}>{fmt(ttc)}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes ? (
          <View style={s.notesWrap}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Conditions ── */}
        <View style={s.notesWrap}>
          <Text style={s.notesLabel}>Conditions de paiement</Text>
          <Text style={s.notesText}>
            {isDevis
              ? "Devis valable 30 jours. En cas d'acceptation, un acompte de 30 % sera demandé avant le démarrage des travaux."
              : 'Règlement à réception de facture par virement bancaire. Tout retard de paiement entraîne des pénalités au taux légal en vigueur.'}
          </Text>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Fourmiliance — Agence Web &amp; IA — Perpignan (66000) — contact@fourmiliance.fr
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
