# 📐 Web-CAD Studio – Parametric 3D CAD & Engineering Tool

A modern, browser-based 3D CAD tool for interactive parameterization, inspection, and manufacturing preparation of technical parts (mechanical engineering, enclosure design, 3D printing).

---

## ✨ Features & Capabilities

### 1. Parametric Part Generators
* **⚙️ Spur Gear (Involute Teeth):**
  * True DIN 867 / ISO 53 involute flank geometry with configurable module ($m$), number of teeth ($z$), pressure angle ($\alpha$), and face width ($b$).
  * Center bore with DIN 6885 keyway broached through both gear body and cylindrical hub.
* **🔘 Pipe Flange (EN 1092-1 / DIN):**
  * Flange outer diameter, flange thickness, tapered welding neck with weld bevel, and pipe inner bore.
  * Configurable bolt circle (number of bolts $n$, hole Ø, bolt circle Ø) and raised face with automatic geometric clearance guards.
* **📦 Electronics Enclosure:**
  * Exact outer dimensions ($L \times W \times H$), wall thickness, and corner radii ($R$).
  * 4 integrated screw bosses with pilot holes automatically inset clear of rounded corners.
* **🪄 Gearbox Shaft (Multi-Stepped):**
  * 4 shaft steps (diameters & lengths individually customizable for drive ends and bearing seats).
  * Lead-in chamfers, crisp machined shoulders, and 60° DIN 332 center holes.
* **🔩 Hex Bolt & Nut (DIN 933):**
  * Thread diameter (M4–M30), chamfered shank length, width across flats, head height, and positionable hex nut.
* **🔧 Steep Taper Shank Form A (DIN 2080-1):**
  * Standard presets for **SK 30, SK 40, SK 50, SK 60, SK 70, and SK 80** plus full custom parameterization.
  * Exact **7:24 steep taper** ($\alpha/2 = 8.297^\circ$), cylindrical pilot ($d_2$ a10), concave internal drawbar thread bore ($d_3$, M12–M48) with $118^\circ$ drill point, gauge-plane offset ($a$), and drive flange ($d_4$) with two opposing drive key slots ($b$ H12).

### 2. CAD Inspection & Analysis
* **✂️ Dynamic Section Plane (Clipping Plane):**
  * Live cross-section along the Z, X, or Y axis with auto-ranged position slider, visual cut-plane indicator, and synchronized mesh + CAD edge clipping.
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
  * True Z-Up metric XY working grid (DIN ISO 841).
  * 3D bounding-box wireframe with live X / Y / Z millimeter dimension callouts.

### 3. Visualization Modes & Camera
* **Standard CAD Views:** Isometric, Top, Front, Right — automatically fitted to active part dimensions.
* **Camera Projection:** Seamless switch between perspective camera and distortion-free **orthographic projection** (preserving framing and zoom).
* **Shader Modes:**
  * *CAD Edges (Shaded + Outlines)*: Highlighted edges for a technical drawing look.
  * *Shaded*: Studio-lit PBR materials with procedural reflections.
  * *Wireframe*: Triangle mesh structure.
  * *X-Ray / Ghost*: Translucent display of hidden internal geometry.
  * *Normals*: Color-coded surface normals for curvature inspection.

### 4. Export & Import
* **💾 STL Export (Binary):**
  * Generates compact standard binary STL files for slicers like PrusaSlicer, Bambu Studio, or Cura.
* **📦 OBJ Export:**
  * Wavefront OBJ with normals for downstream workflows in Blender, CAD, or rendering suites.
* **📄 Technical Data Sheet:**
  * Generates a structured inspection report with timestamp, all active dimensions, material, triangle count, and mass (supports both parametric and imported meshes).
* **📁 Drag & Drop / Browse STL & OBJ Import:**
  * Supports Binary STL, ASCII STL, and Wavefront OBJ files directly in the browser to measure, inspect, and section.

---

## 🚀 Quick Start

1. Open `index.html` directly in your browser (Google Chrome, Edge, Firefox, Safari).
2. No build step or local Node server is required — all libraries (Three.js & OrbitControls) are loaded via CDN.
