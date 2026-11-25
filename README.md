# FootRef

> **English** | [Čeština](#čeština)

A browser-based football referee and match management web application for tracking live match time, stoppage time, goals, cards, substitutions, and match history.

## Features

- **Custom Match Setup:** Configure match name, game mode (with goalkeeper or rotating "last man" goalkeeper), maximum substitutions per period, custom match periods, and breaks.
- **Team Rosters:** Manage starting lineups, goalkeepers, and bench substitutes for both teams.
- **Live Match Timer & Stoppage Time:** Countdown timer per period with quick stoppage time additions (`+1m`, `+2m`, `+5m`), optional auto-finish, and Web Audio API whistle/sound alerts.
- **Score, Cards & Substitutions:** Track goals, issue yellow and red cards to specific players, and perform live player substitutions respecting per-period limits.
- **Match History & Persistence:** Automatically saves matches and detailed event logs to `localStorage` under **Moje zápasy**.

## Technologies

- **HTML5** & **CSS3**
- **Vanilla JavaScript (ES6+)**
- **Google Fonts (`Inter`)**
- **Web Audio API** & **Web Storage API (`localStorage`)**

## Usage

No build tools or backend required:

1. Clone or download this repository.
2. Open `index.html` directly in any modern web browser (or open it via GitHub Pages / a local static server).
3. Click **Vytvořit nový zápas** to set up teams, periods, and rules, then start officiating.

---

## Čeština

Webová aplikace pro fotbalové rozhodčí a správu zápasů přímo v prohlížeči — sledování hracího času, nastavení, gólů, karet, střídání a historie zápasů.

### Hlavní funkce

- **Nastavení zápasu na míru:** Konfigurace názvu zápasu, typu hry (s brankářem nebo „na posledního“), maximálního počtu střídání za část, délky jednotlivých částí zápasu a přestávek.
- **Soupisky týmů:** Správa základní sestavy, brankářů a náhradníků na lavičce pro oba týmy.
- **Časomíra a nastavení:** Odpočet času jednotlivých částí s rychlým přidáním nastavení (`+1m`, `+2m`, `+5m`), volitelným automatickým ukončením a zvukovými signály přes Web Audio API.
- **Skóre, karty a střídání:** Zaznamenávání gólů, udělování žlutých a červených karet konkrétním hráčům a provádění střídání v rámci nastavených limitů.
- **Historie zápasů a ukládání:** Automatické ukládání rozehraných i dokončených zápasů včetně detailů do `localStorage` v sekci **Moje zápasy**.

### Technologie

- **HTML5** & **CSS3**
- **Vanilla JavaScript (ES6+)**
- **Google Fonts (`Inter`)**
- **Web Audio API** & **Web Storage API (`localStorage`)**

### Spuštění

Aplikace nevyžaduje žádný build ani backend:

1. Naklonujte nebo stáhněte tento repozitář.
2. Otevřete soubor `index.html` přímo v libovolném moderním prohlížeči (případně přes GitHub Pages nebo lokální statický server).
3. Klikněte na **Vytvořit nový zápas**, nastavte týmy, části zápasu a pravidla a spusťte zápas.
