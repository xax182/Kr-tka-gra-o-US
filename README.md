# Uciekaj przed US

Krótka platformówka w stylu Mario (HTML5 + Phaser 3), zaprojektowana pod iPada.
Brunet ucieka przez 3 poziomy przed Urzędem Skarbowym. Na drodze stoją teleporty do
Komendy Policji – wyjść można dopiero po pokonaniu policjanta (skacz mu na głowę).

## Sterowanie
- iPad: przyciski ◀ ▶ po lewej, skok po prawej (multi-touch).
- Komputer: strzałki / A D + spacja (lub W / Z) do skoku.

## Zasady
- Urząd Skarbowy biegnie Twoją trasą z kilkusekundowym opóźnieniem – nie stój w miejscu.
- Teleport (świecąca gwiazda) w niskim tunelu zabiera Cię do komendy; policjant szarżuje
  (czerwony kolor + „!” = zaraz szarża). Dotknięcie z boku kosztuje życie (♥).
- Dziura = utrata życia. Monety to złotówki do zachowania.

## Granie na iPadzie
1. Włącz GitHub Pages (Settings → Pages → Source: GitHub Actions) – workflow `pages.yml` wdroży grę.
2. Otwórz link w Safari, potem „Udostępnij → Dodaj do ekranu początkowego” – gra działa pełnoekranowo i offline.

Lokalnie: `python3 -m http.server` i otwórz `http://localhost:8000` (`?touch=1` pokazuje przyciski dotykowe).

## Dla programisty
- `levels.js` – poziomy budowane z prostokątów; `node check_levels.js` sprawdza przejście każdego poziomu.
- `game.js` – sceny: Boot, Title, Game, Arena (komenda), End. Grafika rysowana w kodzie, dźwięk z WebAudio.
- `lib/phaser.min.js` – Phaser 3.80.1 (MIT), dołączony lokalnie, żeby gra działała offline.
