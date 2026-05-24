/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        fourmiliance: {
          // ── Palette primaire ─────────────────────────────────────────
          'deep':        '#0F2008',
          'forest':      '#1E4010',
          'mid':         '#2D5A1B',
          'light':       '#4A7A2E',
          'ocre':        '#B87520',
          'ocre-dark':   '#9B6018',
          'ocre-light':  '#D4A052',
          'cream':       '#F9F6F0',
          'cream-dark':  '#EDE8DF',

          // ── Tokens sémantiques UI ────────────────────────────────────
          'border':      '#E0DAD0',   // bordures cards, inputs, tables
          'border-soft': '#EDE8DF',   // onglets, tabs bg (= cream-dark)
          'track':       '#F0EBE4',   // barres de progression bg
          'surface':     '#FAFAF8',   // hover de ligne (table, liste)
          'ink':         '#1A1A1A',   // texte primaire fort
          'body':        '#2A2A2A',   // texte corps
          'tertiary':    '#5A5A5A',   // labels, texte tertiaire
          'muted':       '#7A7A7A',   // texte atténué
          'ghost':       '#9A9A9A',   // placeholders, timestamps
          'disabled':    '#C0B8B0',   // icônes vides, éléments désactivés

          // ── Couleurs d'état (tonalités biotope) ──────────────────────
          'success-bg':  '#E0EDD8',   // badge fond succès / actif
          'success':     '#2D5A1B',   // badge texte succès (= mid)
          'warm-bg':     '#F5EAD8',   // badge fond chaud (devis, attente)
          'rust':        '#8B2A20',   // erreur / retrait / perdu
          'rust-bg':     '#F5E0DC',   // badge fond erreur
        },
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        ui:   '8px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)',
        sm:   '0 1px 4px rgba(0,0,0,.08)',
      },
    },
  },
  plugins: [],
}
