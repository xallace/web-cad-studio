/**
 * Web-CAD Studio - Main Application Controller
 */

// Density in g/cm³
const MATERIAL_DENSITIES = {
  steel: { name: 'Werkzeugstahl (1.2379)', density: 7.85 },
  aluminum: { name: 'Aluminium (AlMgSi0.5)', density: 2.70 },
  brass: { name: 'Messing (CuZn39Pb3)', density: 8.50 },
  plastic_orange: { name: 'PLA Polymer (3D-Druck)', density: 1.24 },
  plastic_white: { name: 'POM-C (Polyacetal)', density: 1.41 },
  cast_iron: { name: 'Grauguss (GJL-250)', density: 7.20 }
};

// Part parameter schemas
const PART_SCHEMAS = {
  gear: {
    name: 'Stirnrad (Evolvente)',
    icon: '⚙️',
    description: 'DIN 867 Zahnrad mit Evolventenflanke, Passfedernut DIN 6885 und Nabe',
    generator: (p) => ParametricParts.generateSpurGear(p),
    params: [
      { id: 'module', label: 'Modul (m)', min: 1.0, max: 10.0, step: 0.5, default: 3.0, unit: 'mm' },
      { id: 'teeth', label: 'Zähnezahl (z)', min: 8, max: 80, step: 1, default: 24, unit: '' },
      { id: 'faceWidth', label: 'Zahnbreite (b)', min: 5, max: 80, step: 1, default: 20, unit: 'mm' },
      { id: 'boreDiameter', label: 'Bohrungs-Ø (d_i)', min: 6, max: 60, step: 1, default: 18, unit: 'mm' },
      { id: 'pressureAngle', label: 'Eingriffswinkel (α)', min: 14.5, max: 25.0, step: 0.5, default: 20.0, unit: '°' },
      { id: 'hasKeyway', label: 'Passfedernut aktiv', type: 'checkbox', default: true },
      { id: 'keywayWidth', label: 'Nutbreite (b)', min: 2, max: 16, step: 1, default: 6, unit: 'mm' },
      { id: 'keywayDepth', label: 'Nuttiefe (t)', min: 1, max: 8, step: 0.2, default: 2.8, unit: 'mm' },
      { id: 'hasHub', label: 'Nabe vorhanden', type: 'checkbox', default: true },
      { id: 'hubDiameter', label: 'Naben-Ø', min: 15, max: 80, step: 1, default: 36, unit: 'mm' },
      { id: 'hubLength', label: 'Nabenlänge', min: 2, max: 40, step: 1, default: 10, unit: 'mm' }
    ]
  },
  flange: {
    name: 'Rohrflansch (DIN/EN)',
    icon: '🔘',
    description: 'Flansch mit Schweißansatz, Lochkreis und Dichtleiste nach EN 1092-1',
    generator: (p) => ParametricParts.generatePipeFlange(p),
    params: [
      { id: 'flangeDia', label: 'Flansch-Außen-Ø', min: 80, max: 300, step: 5, default: 165, unit: 'mm' },
      { id: 'flangeThick', label: 'Flanschblattdicke (C)', min: 10, max: 50, step: 1, default: 18, unit: 'mm' },
      { id: 'pipeOutDia', label: 'Rohransatz-Außen-Ø', min: 40, max: 200, step: 1, default: 76.1, unit: 'mm' },
      { id: 'pipeInDia', label: 'Rohr-Innenbohrung-Ø', min: 25, max: 180, step: 1, default: 60.0, unit: 'mm' },
      { id: 'neckHeight', label: 'Schweißansatzhöhe (H)', min: 10, max: 100, step: 5, default: 35, unit: 'mm' },
      { id: 'boltCircleDia', label: 'Lochkreis-Ø (K)', min: 60, max: 250, step: 5, default: 125, unit: 'mm' },
      { id: 'numBolts', label: 'Schraubenlöcher (n)', min: 4, max: 16, step: 2, default: 4, unit: '' },
      { id: 'boltHoleDia', label: 'Schraubenloch-Ø (d)', min: 8, max: 30, step: 1, default: 18, unit: 'mm' },
      { id: 'hasRaisedFace', label: 'Dichtleiste aktiv', type: 'checkbox', default: true },
      { id: 'raisedFaceDia', label: 'Dichtleisten-Ø', min: 50, max: 200, step: 5, default: 110, unit: 'mm' },
      { id: 'raisedFaceHeight', label: 'Dichtleistenhöhe', min: 1, max: 10, step: 0.5, default: 3, unit: 'mm' }
    ]
  },
  enclosure: {
    name: 'Elektronik-Gehäuse',
    icon: '📦',
    description: 'Gerätegehäuse mit parametrischer Wandstärke, Rundung und 4 Eck-Schraubendomen',
    generator: (p) => ParametricParts.generateEnclosure(p),
    params: [
      { id: 'length', label: 'Länge (X)', min: 50, max: 300, step: 5, default: 140, unit: 'mm' },
      { id: 'width', label: 'Breite (Y)', min: 40, max: 200, step: 5, default: 90, unit: 'mm' },
      { id: 'height', label: 'Gesamthöhe (Z)', min: 20, max: 120, step: 2, default: 45, unit: 'mm' },
      { id: 'wallThickness', label: 'Wandstärke', min: 1.5, max: 8.0, step: 0.5, default: 3.0, unit: 'mm' },
      { id: 'cornerRadius', label: 'Eckenradius (R)', min: 1, max: 25, step: 1, default: 8, unit: 'mm' },
      { id: 'bossDiameter', label: 'Schraubendome-Ø', min: 6, max: 18, step: 1, default: 10, unit: 'mm' },
      { id: 'bossHoleDia', label: 'Schrauben-Kernloch-Ø', min: 2.0, max: 6.0, step: 0.2, default: 3.2, unit: 'mm' }
    ]
  },
  shaft: {
    name: 'Getriebewelle (Abgestuft)',
    icon: '🪄',
    description: 'Mehrstufige Welle mit Lagersitzen, Wellenbund, Fasen und Zentrierbohrung',
    generator: (p) => ParametricParts.generateSteppedShaft(p),
    params: [
      { id: 'dia1', label: 'Stufe 1 Ø (Antrieb)', min: 10, max: 60, step: 1, default: 25, unit: 'mm' },
      { id: 'len1', label: 'Stufe 1 Länge', min: 10, max: 80, step: 5, default: 30, unit: 'mm' },
      { id: 'dia2', label: 'Stufe 2 Ø (Lagersitz 1)', min: 15, max: 80, step: 1, default: 35, unit: 'mm' },
      { id: 'len2', label: 'Stufe 2 Länge', min: 15, max: 100, step: 5, default: 50, unit: 'mm' },
      { id: 'dia3', label: 'Stufe 3 Ø (Wellenbund)', min: 25, max: 120, step: 1, default: 50, unit: 'mm' },
      { id: 'len3', label: 'Stufe 3 Länge', min: 10, max: 80, step: 5, default: 25, unit: 'mm' },
      { id: 'dia4', label: 'Stufe 4 Ø (Lagersitz 2)', min: 15, max: 80, step: 1, default: 35, unit: 'mm' },
      { id: 'len4', label: 'Stufe 4 Länge', min: 15, max: 100, step: 5, default: 45, unit: 'mm' },
      { id: 'chamfer', label: 'Einführfase', min: 0.5, max: 4.0, step: 0.5, default: 1.5, unit: 'mm' },
      { id: 'centerBore', label: 'Zentrierbohrungs-Ø', min: 0, max: 12, step: 1, default: 6, unit: 'mm' }
    ]
  },
  bolt: {
    name: 'Sechskantschraube & Mutter',
    icon: '🔩',
    description: 'DIN 933 Sechskantschraube mit Schaft und frei positionierbarer Sechskantmutter',
    generator: (p) => ParametricParts.generateHexBolt(p),
    params: [
      { id: 'dia', label: 'Gewindedurchmesser (d)', min: 4, max: 30, step: 2, default: 12, unit: 'mm' },
      { id: 'length', label: 'Schaftlänge (l)', min: 15, max: 150, step: 5, default: 55, unit: 'mm' },
      { id: 'headWidth', label: 'Schlüsselweite (SW)', min: 7, max: 46, step: 1, default: 19, unit: 'mm' },
      { id: 'headHeight', label: 'Kopfhöhe (k)', min: 3, max: 20, step: 0.5, default: 7.5, unit: 'mm' },
      { id: 'hasNut', label: 'Mutter anzeigen', type: 'checkbox', default: true },
      { id: 'nutPosition', label: 'Mutter-Position entlang Schaft', min: 2, max: 140, step: 2, default: 35, unit: 'mm' }
    ]
  }
};

class AppController {
  constructor() {
    this.engine = new CADEngine('viewport-container');
    this.currentPartKey = 'gear';
    this.currentParams = {};
    this.currentGeometry = null;

    this.initUI();
    this.loadPart('gear');
  }

  initUI() {
    // Populate Part Catalog
    const catalogContainer = document.getElementById('catalog-list');
    catalogContainer.innerHTML = '';

    Object.entries(PART_SCHEMAS).forEach(([key, schema]) => {
      const card = document.createElement('div');
      card.className = `part-card ${key === this.currentPartKey ? 'active' : ''}`;
      card.id = `card-${key}`;
      card.innerHTML = `
        <div class="part-card-info">
          <h4>${schema.name}</h4>
          <p>${schema.description.slice(0, 48)}...</p>
        </div>
        <div class="part-icon">${schema.icon}</div>
      `;
      card.onclick = () => this.loadPart(key);
      catalogContainer.appendChild(card);
    });

    // Material Selector
    const matSelect = document.getElementById('material-select');
    matSelect.onchange = (e) => {
      this.engine.setMaterial(e.target.value);
      this.updateMetrics();
    };

    // View buttons
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => this.engine.setView(btn.dataset.view);
    });

    // Camera mode toggle (Perspective / Ortho)
    const orthoBtn = document.getElementById('btn-ortho-toggle');
    orthoBtn.onclick = () => {
      const isOrtho = !this.engine.isOrtho;
      this.engine.setCameraProjection(isOrtho);
      orthoBtn.classList.toggle('active', isOrtho);
      orthoBtn.textContent = isOrtho ? '📐 Orthografisch' : '🎥 Perspektive';
    };

    // Render mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.engine.setRenderMode(btn.dataset.mode);
      };
    });

    // Clipping / Section Plane Toggle & Controls
    const clipBtn = document.getElementById('btn-clipping-toggle');
    const clipWidget = document.getElementById('clipping-widget');
    const clipSlider = document.getElementById('clipping-slider');
    const clipAxisSelect = document.getElementById('clipping-axis');

    clipBtn.onclick = () => {
      const enabled = !this.engine.clippingEnabled;
      clipBtn.classList.toggle('active', enabled);
      clipWidget.classList.toggle('visible', enabled);
      this.engine.setClipping(enabled, clipAxisSelect.value, parseFloat(clipSlider.value));
    };

    clipSlider.oninput = (e) => {
      this.engine.setClipping(true, clipAxisSelect.value, parseFloat(e.target.value));
      document.getElementById('clipping-val-display').textContent = `${e.target.value} mm`;
    };

    clipAxisSelect.onchange = (e) => {
      this.engine.setClipping(true, e.target.value, parseFloat(clipSlider.value));
    };

    // Dimensioning Toggle
    const dimBtn = document.getElementById('btn-dim-toggle');
    dimBtn.onclick = () => {
      const active = !this.engine.showDimensions;
      dimBtn.classList.toggle('active', active);
      this.engine.toggleDimensions(active);
    };

    // Grid Toggle
    const gridBtn = document.getElementById('btn-grid-toggle');
    gridBtn.onclick = () => {
      const active = !this.engine.showGrid;
      gridBtn.classList.toggle('active', active);
      this.engine.toggleGrid(active);
    };

    // Exporter buttons
    document.getElementById('btn-export-stl').onclick = () => {
      if (this.currentGeometry) {
        CADExporters.exportBinarySTL(this.currentGeometry, `${this.currentPartKey}_model.stl`);
      }
    };

    document.getElementById('btn-export-obj').onclick = () => {
      if (this.currentGeometry) {
        CADExporters.exportOBJ(this.currentGeometry, `${this.currentPartKey}_model.obj`);
      }
    };

    document.getElementById('btn-spec-sheet').onclick = () => this.showSpecSheet();
    document.getElementById('modal-close').onclick = () => this.hideSpecSheet();

    // Drag and Drop STL / OBJ support
    this.setupDragAndDrop();
  }

  loadPart(key) {
    this.currentPartKey = key;
    const schema = PART_SCHEMAS[key];

    // Highlight card
    document.querySelectorAll('.part-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`card-${key}`);
    if (activeCard) activeCard.classList.add('active');

    // Set initial params
    this.currentParams = {};
    schema.params.forEach(p => {
      this.currentParams[p.id] = p.default;
    });

    // Build parameter UI
    this.renderParameterControls(schema);

    // Generate part
    this.regeneratePart();
  }

  renderParameterControls(schema) {
    const container = document.getElementById('parameters-container');
    container.innerHTML = '';

    const group = document.createElement('div');
    group.className = 'param-group';
    group.innerHTML = `<div class="param-group-title">${schema.name} Parameter</div>`;

    schema.params.forEach(p => {
      const row = document.createElement('div');
      row.className = 'param-row';

      if (p.type === 'checkbox') {
        row.innerHTML = `
          <div class="param-label-row">
            <span class="param-name">${p.label}</span>
            <input type="checkbox" id="input-${p.id}" ${p.default ? 'checked' : ''} style="cursor:pointer;">
          </div>
        `;
        const chk = row.querySelector(`#input-${p.id}`);
        chk.onchange = (e) => {
          this.currentParams[p.id] = e.target.checked;
          this.regeneratePart();
        };
      } else {
        row.innerHTML = `
          <div class="param-label-row">
            <span class="param-name">${p.label}</span>
            <span class="param-value" id="val-${p.id}">${p.default} ${p.unit}</span>
          </div>
          <div class="param-input-wrap">
            <input type="range" class="cad-slider" id="slider-${p.id}" 
                   min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}">
            <input type="number" class="cad-num-input" id="num-${p.id}" 
                   min="${p.min}" max="${p.max}" step="${p.step}" value="${p.default}">
          </div>
        `;

        const slider = row.querySelector(`#slider-${p.id}`);
        const num = row.querySelector(`#num-${p.id}`);
        const display = row.querySelector(`#val-${p.id}`);

        const updateVal = (val) => {
          const numVal = parseFloat(val);
          slider.value = numVal;
          num.value = numVal;
          display.textContent = `${numVal} ${p.unit}`;
          this.currentParams[p.id] = numVal;
          this.regeneratePart();
        };

        slider.oninput = (e) => updateVal(e.target.value);
        num.onchange = (e) => updateVal(e.target.value);
      }

      group.appendChild(row);
    });

    container.appendChild(group);
  }

  regeneratePart() {
    const schema = PART_SCHEMAS[this.currentPartKey];
    if (!schema) return;

    try {
      this.currentGeometry = schema.generator(this.currentParams);
      this.engine.setMesh(this.currentGeometry);
      this.updateMetrics();
      this.updateStatusBar();
    } catch (err) {
      console.error('Error generating geometry:', err);
    }
  }

  /**
   * Precise analytical volume & surface calculation
   */
  updateMetrics() {
    if (!this.currentGeometry) return;

    const geom = this.currentGeometry.index ? this.currentGeometry.toNonIndexed() : this.currentGeometry;
    const pos = geom.attributes.position.array;

    // 1. Precise Signed Volume of Tetrahedrons (mm³)
    let volumeMm3 = 0;
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    let areaMm2 = 0;

    for (let i = 0; i < pos.length; i += 9) {
      p1.set(pos[i], pos[i + 1], pos[i + 2]);
      p2.set(pos[i + 3], pos[i + 4], pos[i + 5]);
      p3.set(pos[i + 6], pos[i + 7], pos[i + 8]);

      // Signed volume = (p1 . (p2 x p3)) / 6
      const cross = new THREE.Vector3().crossVectors(p2, p3);
      volumeMm3 += p1.dot(cross) / 6.0;

      // Surface area of triangle = 0.5 * |(p2 - p1) x (p3 - p1)|
      const vA = new THREE.Vector3().subVectors(p2, p1);
      const vB = new THREE.Vector3().subVectors(p3, p1);
      areaMm2 += vA.cross(vB).length() * 0.5;
    }

    const absVolumeCm3 = Math.abs(volumeMm3) / 1000.0;
    const areaCm2 = areaMm2 / 100.0;

    // Bounding Box
    const bBox = this.currentGeometry.boundingBox;
    const dx = (bBox.max.x - bBox.min.x).toFixed(1);
    const dy = (bBox.max.y - bBox.min.y).toFixed(1);
    const dz = (bBox.max.z - bBox.min.z).toFixed(1);

    // Mass calculation
    const matKey = this.engine.currentMaterialKey;
    const matInfo = MATERIAL_DENSITIES[matKey] || MATERIAL_DENSITIES.steel;
    const massGram = absVolumeCm3 * matInfo.density;

    // Update DOM
    document.getElementById('metric-vol').textContent = `${absVolumeCm3.toFixed(2)} cm³`;
    document.getElementById('metric-area').textContent = `${areaCm2.toFixed(1)} cm²`;
    document.getElementById('metric-mass').textContent = massGram > 1000 ? `${(massGram / 1000).toFixed(2)} kg` : `${massGram.toFixed(1)} g`;
    document.getElementById('metric-bbox').textContent = `${dx} × ${dy} × ${dz} mm`;

    this.lastMetrics = {
      volumeCm3: absVolumeCm3,
      areaCm2: areaCm2,
      massGram: massGram,
      bbox: `${dx} × ${dy} × ${dz} mm`,
      material: matInfo.name
    };
  }

  updateStatusBar() {
    if (!this.currentGeometry) return;
    const triangleCount = (this.currentGeometry.attributes.position.count / 3) || 0;
    document.getElementById('sb-triangles').textContent = `Dreiecke: ${triangleCount.toLocaleString()}`;
    document.getElementById('sb-part-name').textContent = PART_SCHEMAS[this.currentPartKey].name;
  }

  showSpecSheet() {
    if (!this.lastMetrics) return;
    const modal = document.getElementById('spec-modal');
    const body = document.getElementById('modal-spec-content');

    let paramRows = '';
    const schema = PART_SCHEMAS[this.currentPartKey];
    schema.params.forEach(p => {
      const val = this.currentParams[p.id];
      paramRows += `<tr>
        <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">${p.label}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right;">${val} ${p.unit || ''}</td>
      </tr>`;
    });

    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h4 style="color:#00d2d3; margin-bottom:4px;">${schema.name}</h4>
        <p style="font-size:0.82rem; color:#888;">Erstellt mit Web-CAD Studio am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}</p>
      </div>

      <div style="background:#15171d; border-radius:6px; padding:12px; margin-bottom:16px;">
        <h5 style="color:#d4af37; margin-bottom:8px; text-transform:uppercase; font-size:0.75rem;">Physikalische Kennwerte</h5>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem;">
          <div>Material: <strong>${this.lastMetrics.material}</strong></div>
          <div>Masse: <strong>${this.lastMetrics.massGram > 1000 ? (this.lastMetrics.massGram / 1000).toFixed(3) + ' kg' : this.lastMetrics.massGram.toFixed(1) + ' g'}</strong></div>
          <div>Volumen: <strong>${this.lastMetrics.volumeCm3.toFixed(2)} cm³</strong></div>
          <div>Oberfläche: <strong>${this.lastMetrics.areaCm2.toFixed(1)} cm²</strong></div>
          <div style="grid-column: span 2;">Hüllmaße (BBox): <strong>${this.lastMetrics.bbox}</strong></div>
        </div>
      </div>

      <h5 style="color:#d4af37; margin-bottom:8px; text-transform:uppercase; font-size:0.75rem;">Konstruktionsparameter</h5>
      <table style="width:100%; border-collapse: collapse; font-size:0.85rem;">
        ${paramRows}
      </table>
    `;

    modal.classList.add('visible');
  }

  hideSpecSheet() {
    document.getElementById('spec-modal').classList.remove('visible');
  }

  setupDragAndDrop() {
    const dropArea = this.engine.container;

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.style.filter = 'brightness(1.2)';
    });

    dropArea.addEventListener('dragleave', () => {
      dropArea.style.filter = 'none';
    });

    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.style.filter = 'none';
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        this.loadExternalFile(file);
      }
    });
  }

  loadExternalFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        // Simple binary STL parser
        const view = new DataView(buffer);
        const triangles = view.getUint32(80, true);
        const positions = new Float32Array(triangles * 9);
        const normals = new Float32Array(triangles * 9);

        let offset = 84;
        let posIdx = 0;

        for (let i = 0; i < triangles; i++) {
          const nx = view.getFloat32(offset, true);
          const ny = view.getFloat32(offset + 4, true);
          const nz = view.getFloat32(offset + 8, true);
          offset += 12;

          for (let v = 0; v < 3; v++) {
            positions[posIdx] = view.getFloat32(offset, true);
            positions[posIdx + 1] = view.getFloat32(offset + 4, true);
            positions[posIdx + 2] = view.getFloat32(offset + 8, true);

            normals[posIdx] = nx;
            normals[posIdx + 1] = ny;
            normals[posIdx + 2] = nz;

            offset += 12;
            posIdx += 3;
          }
          offset += 2; // attribute byte count
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

        this.currentGeometry = geom;
        this.engine.setMesh(geom);
        this.updateMetrics();
        document.getElementById('sb-part-name').textContent = `Import: ${file.name}`;
      } catch (err) {
        alert('Fehler beim Laden der Datei. Bitte stelle sicher, dass es sich um eine gültige Binär-STL handelt.');
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.cadApp = new AppController();
});
