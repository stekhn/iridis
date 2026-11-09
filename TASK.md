# TASK: iridis

## Ziel

Baue eine Web-Anwendung, mit der sich Buchcover-Hintergründe im Stil irisierender, körniger Farbverläufe erzeugen lassen. Nutzer stellen ein paar Parameter ein, setzen Titeltexte darüber und exportieren das Ergebnis als Bild.

Die Anwendung ist ein eigenständiges Werkzeug, kein Design-Editor. Sie macht eine Sache gut.

## Referenz

Im Ordner `images/` liegen Fotos von Buchcovern, die den Zielstil zeigen. Sie sind die verbindliche Vorlage für Hintergrund und Typografie. Sieh sie dir an, bevor du anfängst.

Kurzbeschreibung des Stils, falls die Bilder fehlen:

- Weiche, in alle Richtungen verlaufende Farbfelder (Mesh-Gradient), keine linearen Verläufe und keine harten Kanten
- Die Farben bilden geschwungene, bandartige Strukturen, vergleichbar mit einer Seifenblase, einem Ölfilm auf Wasser oder Perlmutt
- Pastellige, spektrale Palette, pro Cover aber eine erkennbare Leitfarbe
- Über dem gesamten Bild ein feines, gleichmäßiges Korn
- Darüber eine fette Grotesk in Weiß, flach aufliegend, ohne Schatten oder Effekte

## Funktionsumfang

### Generator

Die App erzeugt den Hintergrund rechnerisch, nicht aus mitgelieferten Bilddateien. Beim Laden ist sofort ein fertiges Ergebnis sichtbar, ohne dass der Nutzer erst etwas einstellen muss.

Es gibt eine Möglichkeit, eine neue Variante zu würfeln.

### Parameter

Wenige, verständliche Regler. Ungefähr in dieser Größenordnung:

- Leitfarbe oder Farbstimmung
- Stärke der Verwirbelung
- Stärke des Korns
- Seitenverhältnis des Covers

Entscheide selbst, welche Parameter das Ergebnis am stärksten prägen, und beschränke dich darauf. Jeder Regler muss eine sichtbare, nachvollziehbare Wirkung haben. Lieber vier gute Regler als zwölf, die sich gegenseitig neutralisieren.

### Reproduzierbarkeit

Das ist die wichtigste Anforderung.

Jedes Ergebnis muss exakt wiederherstellbar sein. Der vollständige Zustand (Seed plus alle Parameter plus Texte) steht in der URL, sodass ein kopierter Link bei jedem Nutzer und zu jedem späteren Zeitpunkt dasselbe Bild erzeugt.

Daraus folgt: Der Generator darf nichts verwenden, das sich zwischen Aufrufen, Browsern oder Geräten unterscheidet. Alle Zufallswerte kommen aus einem Pseudozufallsgenerator, der mit dem Seed initialisiert wird.

Wenn du das Verfahren später änderst, darf ein alter Link nicht stillschweigend ein anderes Bild liefern. Versioniere den Zustand in der URL.

### Textfelder

Vier Felder, fest vorgegeben, keine freie Textebenen-Verwaltung:

- Autor
- Titel
- Untertitel
- Verlag

Satz und Anordnung orientieren sich an den Referenzbildern. Leere Felder werden einfach nicht gesetzt. Der Nutzer soll nicht positionieren oder Schriftgrößen einstellen müssen, das Layout ergibt sich aus dem Inhalt.

Achte darauf, dass der Text auf hellen Verläufen lesbar bleibt.

### Export

Download in einer Auflösung, die für Druck taugt, nicht nur in Bildschirmgröße. Das exportierte Ergebnis muss dem entsprechen, was auf dem Bildschirm zu sehen ist, einschließlich Korn und Textsatz.

Diese Formate sind zu unterstützen:

- **PNG**, verlustfrei. Das ist die Voreinstellung.
- **JPEG**, mit einstellbarer Qualität, für Web und schnelles Teilen.
- **WebP**, als kleinere Alternative zu beidem.
- **PDF**, für Druck und Weitergabe an eine Druckerei.
- **SVG**, falls du eine Darstellung findest, die den Look ohne eingebettetes Riesenbild trägt. Wenn nicht, lass es weg und begründe das kurz in der README. Erzwinge es nicht.

Beim PDF soll der Text als echter Text mit eingebetteter Schrift vorliegen, nicht als Pixel. Der Hintergrund darf darin als Rasterbild liegen.

Beim Raster-Export ist die Auflösung wählbar, mindestens eine Bildschirmgröße und eine Druckgröße. Zeige dem Nutzer an, welche Pixelmaße dabei herauskommen.

Farbraum ist sRGB. Eine CMYK-Konvertierung gehört nicht in diese App.

Der Dateiname enthält den Seed, damit sich eine exportierte Datei später wieder der URL zuordnen lässt.

## Qualitätsanforderungen

**Performance.** Das Verstellen eines Reglers muss sich unmittelbar anfühlen. Der Generator läuft flüssig auch auf einem Mittelklasse-Smartphone. Der Export darf länger dauern, muss den Nutzer dabei aber über den Fortschritt informieren.

**Progressive Web App.** Installierbar, nach dem ersten Besuch vollständig offline nutzbar. Die App hat keine Serverlogik, alles läuft im Browser. Sie muss sich als statische Dateien ausliefern lassen.

**Bedienbarkeit.** Funktioniert auf Mobilgerät und Desktop. Tastaturbedienbar. Respektiert `prefers-reduced-motion`. Der Hintergrund ist das Ergebnis, nicht die Oberfläche: Die Bedienelemente treten zurück.

**Technische Sorgfalt.** Typsicher, getestet in den Teilen, in denen Korrektheit zählt (Zustandskodierung in der URL, Determinismus des Generators). Keine Tracker, keine externen Laufzeitabhängigkeiten für das Rendering. Schriften werden mitgeliefert, nicht von einem CDN geladen.

## Nicht im Umfang

- Benutzerkonten, Speichern auf einem Server, Teilen-Funktionen jenseits des Links
- Freie Platzierung von Elementen, Ebenen, Formen, Bildupload
- Animierte oder bewegte Hintergründe
- Mehrsprachigkeit

## Entscheidungen, die bei dir liegen

Framework, Rendering-Verfahren, Aufbau des Farbfelds, Art des Rauschens, Kodierung des Zustands in der URL, Teststrategie. Triff eine Wahl, begründe sie kurz in der README und bleibe dabei.

Bevorzuge dabei die einfachere und besser nachvollziehbare Lösung. Das Projekt soll in einem Jahr noch wartbar sein.

## Fertig ist die Aufgabe, wenn

1. Ein Aufruf der App zeigt sofort ein Cover im Zielstil.
2. Die Regler verändern das Ergebnis sichtbar und sofort.
3. Ein kopierter Link erzeugt in einem anderen Browser dasselbe Bild, inklusive Texte.
4. Die vier Textfelder sind gesetzt und sehen aus wie auf den Referenzbildern.
5. Der Export liefert in allen umgesetzten Formaten ein Ergebnis, das dem Bildschirm entspricht, in Druckauflösung und mit Seed im Dateinamen.
6. Die App ist installierbar und funktioniert offline.
7. Die README erklärt Aufbau, getroffene Entscheidungen und Entwicklungs-Setup.
