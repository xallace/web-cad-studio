# 📐 Web-CAD Studio – Parametric 3D CAD & Engineering Tool

A modern, browser-based 3D CAD tool for interactive parameterization, inspection, and manufacturing preparation of technical parts (mechanical engineering, enclosure design, 3D printing).

---

## ✨ Features & Capabilities

### 1. Parametric Part Generators
* **⚙️ Spur Gear (Involute Teeth):**
  * Module ($m$), number of teeth ($z$), pressure angle ($\alpha=20^\circ$), face width ($b$).
  * Center bore with optional keyway (DIN 6885) and cylindrical hub.
* **🔘 Pipe Flange (EN 1092-1 / DIN):**
  * Flange outer diameter, flange thickness, welding neck with chamfer, pipe inner bore.
  * Freely configurable bolt circle (number of bolts $n$, hole Ø, bolt circle Ø) and raised face.
* **📦 Electronics Enclosure:**
  * Outer dimensions ($L \times W \times H$), wall thickness, corner radii ($R$).
  * 4 integrated screw bosses with M3 pilot holes for lid fastening.
* **🪄 Gearbox Shaft (Multi-Stepped):**
  * 4 shaft steps (diameters & lengths individually customizable for drive ends and bearing seats).
  * Lead-in chamfers and center hole (DIN 332).
* **🔩 Hex Bolt & Nut (DIN 933):**
  * Thread diameter (M4–M30), shank length, width across flats, head height, and positionable hex nut.

### 2. CAD Inspection & Analysis
* **✂️ Dynamic Section Plane (Clipping Plane):**
  * Live cross-section along the X, Y, or Z axis with a continuous position slider.
  * Ideal for inspecting cavities, wall thicknesses, and internal bores.
* **📐 Exact Metric & Physics Calculation:**
  * **Volume:** Exact calculation via signed tetrahedron volume ($\sum \frac{p_1 \cdot (p_2 \times p_3)}{6}$).
  * **Surface Area:** Analytical triangle area summation.
  * **Mass:** Dynamic calculation based on material densities:
    * *Tool Steel (7.85 g/cm³)*
    * *Aluminum (2.70 g/cm³)*
    * *Brass (8.50 g/cm³)*
    * *PLA Polymer / 3D Printing (1.24 g/cm³)*
    * *POM-C (1.41 g/cm³)*
    * *Gray Cast Iron (7.20 g/cm³)*
  * **Bounding Box:** $X \times Y \times Z$ in mm.
* **📏 3D Dimensioning & CAD Grid:**
  * Z-axis-aligned metric working grid (DIN ISO 841).
  * Three-dimensional bounding-box wireframe overlay.

### 3. Visualization Modes & Camera
* **Standard CAD Views:** Isometric, Top, Front, Right.
* **Camera Projection:** Switch between perspective camera and distortion-free **orthographic projection**.
* **Shader Modes:**
  * *CAD Edges (Shaded + Outlines)*: Highlighted edges for a technical drawing look.
  * *Shaded*: PBR material with roughness and metallic sheen.
  * *Wireframe*: Triangle mesh structure.
  * *X-Ray / Ghost*: Translucent display of hidden internal geometry.
  * *Normals*: Color-coded surface normals for curvature inspection.

### 4. Export & Import
* **💾 STL Export (Binary):**
  * Generates compact standard binary STL files for slicers like PrusaSlicer, Bambu Studio, or Cura.
* **📦 OBJ Export:**
  * Wavefront OBJ with normals for downstream workflows in Blender, CAD, or rendering suites.
* **📄 Technical Data Sheet:**
  * Generates a structured inspection report with timestamp, all dimensions, material, and mass.
* **📁 Drag & Drop STL Import:**
  * Any external `.stl` file can be dragged and dropped directly into the 3D viewport to measure and section.

---

## 🚀 Quick Start

1. Open `index.html` directly in your browser (Google Chrome, Edge, Firefox, Safari).
2. No build step or local Node server is required — all libraries (Three.js & OrbitControls) are loaded via CDN.
