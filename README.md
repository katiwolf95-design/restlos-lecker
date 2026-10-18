# Restlos lecker

Eine kleine Rezept-App, die Rezepte aus vorhandenen Zutaten findet und eine eigene Sammlung bereitstellt.

## Lokal starten

Die Anwendung besteht aus statischen Dateien und einer Vercel Function. Deshalb sollte sie mit der Vercel CLI lokal gestartet werden, nicht durch direktes Öffnen von `index.html`.

1. Installiere die Vercel CLI.
2. Lege im Projekt eine `.env.local` mit `SPOONACULAR_API_KEY=dein_neuer_api_schluessel` an.
3. Ergänze `DEEPL_API_KEY=dein_deepl_api_schluessel`, wenn Spoonacular-Rezepte auf Deutsch angezeigt werden sollen.
4. Starte `vercel dev` im Projektordner.

Die `.env.local` wird von Git ignoriert. Verwende den zuvor im öffentlichen Repository veröffentlichten Schlüssel nicht weiter; erstelle im Spoonacular-Konto einen neuen Schlüssel.

## Auf Vercel bereitstellen

Importiere das GitHub-Repository als Vercel-Projekt mit dem Projektstammverzeichnis auf diesem Ordner. In Vercel unter **Settings → Environment Variables** die Schlüssel `SPOONACULAR_API_KEY` und `DEEPL_API_KEY` für die gewünschte Umgebung hinterlegen und anschließend neu deployen. Beide Schlüssel werden nur serverseitig verwendet und nicht an den Browser ausgeliefert. Ohne `DEEPL_API_KEY` bleiben Spoonacular-Treffer in der Originalsprache.

## Aktueller Funktionsumfang

- Zutaten- und Zeitfilter-Suche über Spoonacular, serverseitig vermittelt durch `/api/recipes`.
- Automatische deutsche Übersetzung von Spoonacular-Rezepttiteln, Zutaten und Anleitungen über DeepL.
- Zusammenführung externer Treffer mit der deutschsprachigen, eigenen Sammlung in `recipes.json`.
- Zutatenabgleich, Anzeige fehlender Zutaten und Favoriten.
- Eigene Rezepte können im Browser angelegt, durchsucht und entfernt werden.

Eigene Rezepte und Favoriten liegen derzeit ausschließlich im `localStorage` des jeweiligen Browsers. Sie werden nicht an einen Server übertragen oder mit anderen Nutzern geteilt. Für öffentliche Nutzerkonten und gemeinsame Uploads wird eine Datenbank mit Anmeldung, Zugriffsregeln und Moderation benötigt.
