# 📐 Web-CAD Studio – Parametrisches 3D-CAD & Engineering Tool

Ein modernes, browserbasiertes 3D-CAD-Werkzeug zur interaktiven Parametrierung, Inspektion und Fertigungsvorbereitung technischer Bauteile (Maschinenbau, Gehäusebau, 3D-Druck).

---

## ✨ Features & Leistungsumfang

### 1. Parametrische Bauteil-Generatoren
* **⚙️ Stirnrad (Evolventenverzahnung):**
  * Modul ($m$), Zähnezahl ($z$), Eingriffswinkel ($\alpha=20^\circ$), Zahnbreite ($b$).
  * Innenbohrung mit optionaler Passfedernut (DIN 6885) und zylindrischer Nabe.
* **🔘 Rohrflansch (EN 1092-1 / DIN):**
  * Flansch-Außendurchmesser, Flanschdicke, Rohransatz mit Schweißfase, Rohrinnenbohrung.
  * Frei konfigurierbarer Lochkreis (Schraubenanzahl $n$, Loch-Ø, Lochkreis-Ø) und Dichtleiste.
* **📦 Elektronik-Gehäuse:**
  * Außenmaße ($L \times B \times H$), Wandstärke, Eckenradien ($R$).
  * 4 integrierte Schraubendome mit M3-Kernlochbohrungen zur Deckelverschraubung.
* **🪄 Getriebewelle (Mehrstufig):**
  * 4 Wellenabsätze (Durchmesser & Längen individuell anpassbar für Antrieb und Lagersitze).
  * Einführfasen und Zentrierbohrung (DIN 332).
* **🔩 Sechskantschraube & Mutter (DIN 933):**
  * Gewindedurchmesser (M4–M30), Schaftlänge, Schlüsselweite, Kopfhöhe und positionierbare Sechskantmutter.

### 2. CAD-Inspektion & Analyse
* **✂️ Dynamische Schnittebene (Clipping Plane):**
  * Live-Schnitt entlang der X-, Y- oder Z-Achse mit stufenlosem Positionsregler.
  * Ideal zur Begutachtung von Hohlräumen, Wandstärken und internen Bohrungen.
* **📐 Exakte Metrik- & Physikberechnung:**
  * **Volumen:** Exakte Berechnung über das Vorzeichen-Tetraeder-Volumen ($\sum \frac{p_1 \cdot (p_2 \times p_3)}{6}$).
  * **Oberflächeninhalt:** Analytische Dreiecksflächen-Summation.
  * **Masse:** Dynamische Berechnung anhand von Materialdichten:
    * *Werkzeugstahl (7.85 g/cm³)*
    * *Aluminium (2.70 g/cm³)*
    * *Messing (8.50 g/cm³)*
    * *PLA Polymer / 3D-Druck (1.24 g/cm³)*
    * *POM-C (1.41 g/cm³)*
    * *Grauguss (7.20 g/cm³)*
  * **Hüllmaße (Bounding Box):** $X \times Y \times Z$ in mm.
* **📏 3D-Bemaßung & CAD-Raster:**
  * Z-Achsen-angepasstes metrisches Arbeitsraster (DIN ISO 841).
  * Dreidimensionale Bounding-Box-Kantenanzeige.

### 3. Visualisierungsmodi & Kamera
* **Standard-CAD-Ansichten:** Isometrie, Draufsicht (Top), Vorderansicht (Front), Seitenansicht (Right).
* **Kamera-Projektion:** Umschaltung zwischen perspektivischer Kamera und verzerrungsfreier **orthografischer Projektion**.
* **Shader-Modi:**
  * *CAD-Kanten (Shaded + Outlines)*: Betonte Kanten für technische Zeichnungsoptik.
  * *Schattiert*: PBR-Material mit Rauheit und metallischem Glanz.
  * *Gitter (Wireframe)*: Dreiecksnetz-Struktur.
  * *Röntgen (X-Ray / Ghost)*: Transluzente Darstellung verdeckter Geometrien.
  * *Normalen*: Farbkodierte Oberflächennormalen zur Krümmungsinspektion.

### 4. Export & Import
* **💾 STL-Export (Binär):**
  * Erzeugt kompakte Standard-Binär-STLs für Slicer wie PrusaSlicer, Bambu Studio oder Cura.
* **📦 OBJ-Export:**
  * Wavefront OBJ mit Normalen zur Weiterverarbeitung in Blender, CAD- oder Rendering-Suiten.
* **📄 Technisches Datenblatt:**
  * Generiert ein strukturiertes Prüfprotokoll mit Datum, allen Abmessungen, Werkstoff und Masse.
* **📁 Drag & Drop STL-Import:**
  * Jede externe `.stl`-Datei kann direkt per Drag & Drop in das 3D-Fenster geladen, vermessen und geschnitten werden.

---

## 🚀 Schnellstart

1. Öffne die Datei `index.html` direkt im Browser (Google Chrome, Edge, Firefox, Safari).
2. Es ist kein Build-Schritt oder lokaler Node-Server erforderlich – alle Bibliotheken (Three.js & OrbitControls) werden über CDN eingebunden.
