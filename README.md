# Kalendarzyk

Dwujęzyczna aplikacja webowa do prywatnego planowania wyjazdów oraz
orientacyjnego podglądu kolejnych miesiączek, owulacji i okna płodnego.
Dane użytkowniczki są przechowywane wyłącznie w `localStorage` jej
przeglądarki; aplikacja nie ma kont ani backendu.

## Funkcje

- prognoza na 6 lub 12 miesięcy na podstawie ostatniej miesiączki i typowej długości cyklu
- dodawanie, edycja i usuwanie wielu planowanych wyjazdów także bez danych cyklu
- wizualne nakładanie wyjazdów na prognozę oraz neutralne ikony przecięć dat
- oznaczenia miesiączki, szacowanej owulacji i okna płodnego z możliwością ukrywania warstw
- interfejs po polsku i angielsku
- lokalny zapis ustawień i planów, wybór zakresu usuwania danych oraz eksport aktualnego widoku do PNG
- stale widoczna informacja, że prognoza nie jest metodą antykoncepcji ani poradą medyczną

## Uruchomienie

Wymagane jest Node.js `>=20.9.0` oraz npm `>=8.3.0`; wersja npm musi
obsługiwać nadpisanie poprawionej zależności `postcss`.

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem [http://localhost:3000](http://localhost:3000).

## Weryfikacja

```bash
npm run lint
npm run test
npm run build
```

## Wdrożenie

Projekt jest standardową aplikacją Next.js App Router, gotową do wdrożenia na
Vercelu bez zmiennych środowiskowych ani dodatkowych usług.
