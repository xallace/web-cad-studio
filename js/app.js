/**
 * Web-CAD Studio - Main Application Controller
 */

// Density in g/cm³
const MATERIAL_DENSITIES = {
  steel: { name: 'Tool Steel (1.2379)', density: 7.85 },
  aluminum: { name: 'Aluminum (AlMgSi0.5)', density: 2.70 },
  brass: { name: 'Brass (CuZn39Pb3)', density: 8.50 },
  plastic_orange: { name: 'PLA Polymer (3D Print)', density: 1.24 },
  plastic_white: { name: 'POM-C (Polyacetal)', density: 1.41 },
  cast_iron: { name: 'Gray Cast Iron (GJL-250)', density: 7.20 }
};

// Part parameter schemas
const PART_SCHEMAS = {
  gear: {
    name: 'Spur Gear (Involute)',
    icon: '⚙️',
    description: 'DIN 867 involute gear with DIN 6885 keyway & hub',
    generator: (p) => ParametricParts.generateSpurGear(p),
    params: [
      { id: 'module', label: 'Module (m)', min: 1.0, max: 10.0, step: 0.5, default: 3.0, unit: 'mm' },
      { id: 'teeth', label: 'Number of Teeth (z)', min: 8, max: 80, step: 1, default: 24, unit: '' },
      { id: 'faceWidth', label: 'Face Width (b)', min: 5, max: 80, step: 1, default: 20, unit: 'mm' },
      { id: 'boreDiameter', label: 'Bore Ø (d_i)', min: 6, max: 60, step: 1, default: 18, unit: 'mm' },
      { id: 'pressureAngle', label: 'Pressure Angle (α)', min: 14.5, max: 25.0, step: 0.5, default: 20.0, unit: '°' },
      { id: 'hasKeyway', label: 'Keyway Enabled', type: 'checkbox', default: true },
      { id: 'keywayWidth', label: 'Keyway Width (b)', min: 2, max: 16, step: 1, default: 6, unit: 'mm', dependsOn: 'hasKeyway' },
      { id: 'keywayDepth', label: 'Keyway Depth (t)', min: 1, max: 8, step: 0.2, default: 2.8, unit: 'mm', dependsOn: 'hasKeyway' },
      { id: 'hasHub', label: 'Hub Enabled', type: 'checkbox', default: true },
      { id: 'hubDiameter', label: 'Hub Ø', min: 15, max: 80, step: 1, default: 36, unit: 'mm', dependsOn: 'hasHub' },
      { id: 'hubLength', label: 'Hub Length', min: 2, max: 40, step: 1, default: 10, unit: 'mm', dependsOn: 'hasHub' }
    ]
  },
  flange: {
    name: 'Pipe Flange (DIN/EN)',
    icon: '🔘',
    description: 'EN 1092-1 weld-neck flange, bolt circle & raised face',
    generator: (p) => ParametricParts.generatePipeFlange(p),
    params: [
      { id: 'flangeDia', label: 'Flange Outer Ø', min: 80, max: 300, step: 5, default: 165, unit: 'mm' },
      { id: 'flangeThick', label: 'Flange Thickness (C)', min: 10, max: 50, step: 1, default: 18, unit: 'mm' },
      { id: 'pipeOutDia', label: 'Pipe Neck Outer Ø', min: 40, max: 200, step: 1, default: 76.1, unit: 'mm' },
      { id: 'pipeInDia', label: 'Pipe Inner Bore Ø', min: 25, max: 180, step: 1, default: 60.0, unit: 'mm' },
      { id: 'neckHeight', label: 'Welding Neck Height (H)', min: 0, max: 100, step: 5, default: 35, unit: 'mm' },
      { id: 'boltCircleDia', label: 'Bolt Circle Ø (K)', min: 60, max: 250, step: 5, default: 125, unit: 'mm' },
      { id: 'numBolts', label: 'Bolt Holes (n)', min: 4, max: 16, step: 2, default: 4, unit: '' },
      { id: 'boltHoleDia', label: 'Bolt Hole Ø (d)', min: 8, max: 30, step: 1, default: 18, unit: 'mm' },
      { id: 'hasRaisedFace', label: 'Raised Face Enabled', type: 'checkbox', default: true },
      { id: 'raisedFaceDia', label: 'Raised Face Ø', min: 50, max: 200, step: 5, default: 110, unit: 'mm', dependsOn: 'hasRaisedFace' },
      { id: 'raisedFaceHeight', label: 'Raised Face Height', min: 1, max: 10, step: 0.5, default: 3, unit: 'mm', dependsOn: 'hasRaisedFace' }
    ]
  },
  enclosure: {
    name: 'Electronics Enclosure',
    icon: '📦',
    description: 'Parametric housing with corner radii & 4 screw bosses',
    generator: (p) => ParametricParts.generateEnclosure(p),
    params: [
      { id: 'length', label: 'Length (X)', min: 50, max: 300, step: 5, default: 140, unit: 'mm' },
      { id: 'width', label: 'Width (Y)', min: 40, max: 200, step: 5, default: 90, unit: 'mm' },
      { id: 'height', label: 'Total Height (Z)', min: 20, max: 120, step: 2, default: 45, unit: 'mm' },
      { id: 'wallThickness', label: 'Wall Thickness', min: 1.5, max: 8.0, step: 0.5, default: 3.0, unit: 'mm' },
      { id: 'cornerRadius', label: 'Corner Radius (R)', min: 1, max: 25, step: 1, default: 8, unit: 'mm' },
      { id: 'bossDiameter', label: 'Screw Boss Ø', min: 6, max: 18, step: 1, default: 10, unit: 'mm' },
      { id: 'bossHoleDia', label: 'Screw Pilot Hole Ø', min: 2.0, max: 6.0, step: 0.2, default: 3.2, unit: 'mm' }
    ]
  },
  shaft: {
    name: 'Gearbox Shaft (Stepped)',
    icon: '🪄',
    description: 'Multi-stepped shaft with bearing seats & chamfers',
    generator: (p) => ParametricParts.generateSteppedShaft(p),
    params: [
      { id: 'dia1', label: 'Step 1 Ø (Drive End)', min: 10, max: 60, step: 1, default: 25, unit: 'mm' },
      { id: 'len1', label: 'Step 1 Length', min: 10, max: 80, step: 5, default: 30, unit: 'mm' },
      { id: 'dia2', label: 'Step 2 Ø (Bearing Seat 1)', min: 15, max: 80, step: 1, default: 35, unit: 'mm' },
      { id: 'len2', label: 'Step 2 Length', min: 15, max: 100, step: 5, default: 50, unit: 'mm' },
      { id: 'dia3', label: 'Step 3 Ø (Shoulder)', min: 25, max: 120, step: 1, default: 50, unit: 'mm' },
      { id: 'len3', label: 'Step 3 Length', min: 10, max: 80, step: 5, default: 25, unit: 'mm' },
      { id: 'dia4', label: 'Step 4 Ø (Bearing Seat 2)', min: 15, max: 80, step: 1, default: 35, unit: 'mm' },
      { id: 'len4', label: 'Step 4 Length', min: 15, max: 100, step: 5, default: 45, unit: 'mm' },
      { id: 'chamfer', label: 'Lead-in Chamfer', min: 0, max: 4.0, step: 0.5, default: 1.5, unit: 'mm' },
      { id: 'centerBore', label: 'Center Hole Ø', min: 0, max: 12, step: 1, default: 6, unit: 'mm' }
    ]
  },
  bolt: {
    name: 'Hex Bolt & Nut',
    icon: '🔩',
    description: 'DIN 933 hex bolt with shaft & positionable hex nut',
    generator: (p) => ParametricParts.generateHexBolt(p),
    params: [
      { id: 'dia', label: 'Thread Diameter (d)', min: 4, max: 30, step: 2, default: 12, unit: 'mm' },
      { id: 'length', label: 'Shank Length (l)', min: 15, max: 150, step: 5, default: 55, unit: 'mm' },
      { id: 'headWidth', label: 'Width Across Flats (s)', min: 7, max: 46, step: 1, default: 19, unit: 'mm' },
      { id: 'headHeight', label: 'Head Height (k)', min: 3, max: 20, step: 0.5, default: 7.5, unit: 'mm' },
      { id: 'hasNut', label: 'Show Hex Nut', type: 'checkbox', default: true },
      { id: 'nutPosition', label: 'Nut Position Along Shank', min: 2, max: 140, step: 2, default: 35, unit: 'mm', dependsOn: 'hasNut' }
    ]
  },
  steepTaper: {
    name: 'Steep Taper Shank (DIN 2080)',
    icon: '🔧',
    description: 'DIN 2080-1 Form A (7:24) tool shank, SK 30–80',
    generator: (p) => ParametricParts.generateSteepTaperShank(p),
    presets: ParametricParts.DIN_2080_FORM_A_PRESETS,
    presetParamId: 'sizeNr',
    params: [
      {
        id: 'sizeNr',
        label: 'DIN 2080-1 Size (Nr.)',
        type: 'select',
        default: '40',
        options: [
          { value: '30', label: 'SK 30 (DIN 2080 – A 30)' },
          { value: '40', label: 'SK 40 (DIN 2080 – A 40)' },
          { value: '50', label: 'SK 50 (DIN 2080 – A 50)' },
          { value: '60', label: 'SK 60 (DIN 2080 – A 60)' },
          { value: '70', label: 'SK 70 (DIN 2080 – A 70)' },
          { value: '80', label: 'SK 80 (DIN 2080 – A 80)' },
          { value: 'custom', label: 'Custom Dimensions' }
        ]
      },
      { id: 'd1', label: 'Taper Gauge Ø (d₁)', min: 20, max: 260, step: 0.05, default: 44.45, unit: 'mm' },
      { id: 'd2', label: 'Pilot Ø (d₂ a10)', min: 10, max: 160, step: 0.1, default: 25.3, unit: 'mm' },
      { id: 'd3', label: 'Drawbar Thread (d₃)', min: 0, max: 52, step: 1, default: 16, formatValue: (v) => (v > 0 ? `M${v}` : 'None') },
      { id: 'd4', label: 'Flange Ø (d₄)', min: 35, max: 360, step: 0.5, default: 63.0, unit: 'mm' },
      { id: 'l1', label: 'Shank Length (l₁)', min: 40, max: 480, step: 0.2, default: 93.4, unit: 'mm' },
      { id: 'a', label: 'Gauge Offset (a)', min: 0.5, max: 12.0, step: 0.1, default: 1.6, unit: 'mm' },
      { id: 'b', label: 'Drive Slot Width (b H12)', min: 6.0, max: 50.0, step: 0.1, default: 16.1, unit: 'mm' },
      { id: 'flangeThick', label: 'Flange Thickness', min: 6.0, max: 60.0, step: 0.5, default: 14.0, unit: 'mm' },
      { id: 'threadDepth', label: 'Thread Bore Depth', min: 0, max: 140, step: 1, default: 32, unit: 'mm' }
    ],
    getSpecExtras: (p) => {
      const d1 = Number(p.d1) || 44.45;
      const d2 = Number(p.d2) || 25.3;
      const l1 = Number(p.l1) || 93.4;
      const taperLen = Math.min(l1, Math.max(0, (d1 - d2) * (24 / 7)));
      const pilotLen = Math.max(0, l1 - taperLen);
      const halfAngleDeg = (Math.atan(7 / 48) * 180) / Math.PI;
      const designation = p.sizeNr && p.sizeNr !== 'custom'
        ? `Steilkegelschaft DIN 2080 – A ${p.sizeNr} AT4`
        : 'Steilkegelschaft DIN 2080 – A (Custom)';
      return [
        { label: 'DIN Designation', value: designation },
        { label: 'Steep Taper Ratio', value: `7:24 (α/2 = ${halfAngleDeg.toFixed(3)}°)` },
        { label: 'Effective Taper Length', value: `${taperLen.toFixed(2)} mm` },
        { label: 'Cylindrical Pilot Length', value: `${pilotLen.toFixed(2)} mm` }
      ];
    }
  }
};

class AppController {
  constructor() {
    this.engine = new CADEngine('viewport-container');
    this.currentPartKey = 'gear';
    this.currentParams = {};
    this.currentGeometry = null;
    this.importedMeshInfo = null; // { fileName, format } when external STL/OBJ is active
    this.lastMetrics = null;

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
      const shortDesc = schema.description.length > 56
        ? `${schema.description.slice(0, 56).replace(/\s+\S*$/, '')}...`
        : schema.description;
      card.innerHTML = `
        <div class="part-card-info">
          <h4>${schema.name}</h4>
          <p>${shortDesc}</p>
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
      orthoBtn.textContent = isOrtho ? '📐 Orthographic' : '🎥 Perspective';
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
    const clipValDisplay = document.getElementById('clipping-val-display');

    clipBtn.onclick = () => {
      const enabled = !this.engine.clippingEnabled;
      clipBtn.classList.toggle('active', enabled);
      clipWidget.classList.toggle('visible', enabled);
      if (enabled) {
        this.engine.clippingEnabled = true;
        this.syncClippingRange(true);
      } else {
        this.engine.setClipping(false, clipAxisSelect.value, parseFloat(clipSlider.value));
      }
    };

    clipSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      this.engine.setClipping(true, clipAxisSelect.value, val);
      clipValDisplay.textContent = `${val.toFixed(1).replace(/\.0$/, '')} mm`;
    };

    clipAxisSelect.onchange = () => {
      this.syncClippingRange(true);
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
        CADExporters.exportBinarySTL(this.currentGeometry, `${this._getExportBaseName()}.stl`);
      }
    };

    document.getElementById('btn-export-obj').onclick = () => {
      if (this.currentGeometry) {
        CADExporters.exportOBJ(this.currentGeometry, `${this._getExportBaseName()}.obj`);
      }
    };

    // Spec Sheet Modal
    const specModal = document.getElementById('spec-modal');
    document.getElementById('btn-spec-sheet').onclick = () => this.showSpecSheet();
    document.getElementById('modal-close').onclick = () => this.hideSpecSheet();
    specModal.addEventListener('click', (e) => {
      if (e.target === specModal) this.hideSpecSheet();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && specModal.classList.contains('visible')) {
        this.hideSpecSheet();
      }
    });

    // Drag-and-Drop + Click-to-Browse STL / OBJ support
    this.setupDragAndDrop();
  }

  _getExportBaseName() {
    if (this.importedMeshInfo) {
      return this.importedMeshInfo.fileName.replace(/\.[^.]+$/, '') || 'imported_model';
    }
    return `${this.currentPartKey}_model`;
  }

  /**
   * Synchronize section plane slider range to active mesh bounding box
   */
  syncClippingRange(resetToCenter = false) {
    if (!this.currentGeometry || !this.currentGeometry.boundingBox) return;

    const clipSlider = document.getElementById('clipping-slider');
    const clipAxisSelect = document.getElementById('clipping-axis');
    const clipValDisplay = document.getElementById('clipping-val-display');
    const axis = clipAxisSelect.value;
    const bBox = this.currentGeometry.boundingBox;

    const span = Math.max(2, bBox.max[axis] - bBox.min[axis]);
    const pad = Math.max(2, Math.ceil(span * 0.08));
    const minVal = Math.floor(bBox.min[axis] - pad);
    const maxVal = Math.ceil(bBox.max[axis] + pad);
    const step = span < 30 ? 0.5 : 1;

    clipSlider.min = minVal;
    clipSlider.max = maxVal;
    clipSlider.step = step;

    let currentVal = resetToCenter ? 0 : parseFloat(clipSlider.value);
    if (!Number.isFinite(currentVal)) currentVal = 0;
    currentVal = Math.min(maxVal, Math.max(minVal, currentVal));
    clipSlider.value = currentVal;
    clipValDisplay.textContent = `${currentVal.toFixed(1).replace(/\.0$/, '')} mm`;

    if (this.engine.clippingEnabled) {
      this.engine.setClipping(true, axis, currentVal);
    }
  }

  loadPart(key) {
    this.currentPartKey = key;
    this.importedMeshInfo = null;
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

    // Generate part and auto-frame camera for newly chosen part
    this.regeneratePart(true);
  }

  renderParameterControls(schema) {
    const container = document.getElementById('parameters-container');
    container.innerHTML = '';

    const group = document.createElement('div');
    group.className = 'param-group';
    group.innerHTML = `<div class="param-group-title">${schema.name} Parameters</div>`;

    const dependentRows = [];
    const controlSyncMap = {};
    let presetSelectEl = null;

    const formatParamVal = (p, val) => {
      if (typeof p.formatValue === 'function') return p.formatValue(val);
      const unitSuffix = p.unit ? ` ${p.unit}` : '';
      return `${val}${unitSuffix}`;
    };

    schema.params.forEach(p => {
      const row = document.createElement('div');
      row.className = 'param-row';
      if (p.dependsOn) {
        dependentRows.push({ row, dependsOn: p.dependsOn });
      }

      if (p.type === 'select') {
        const optionsHtml = (p.options || []).map(opt => {
          const selected = String(opt.value) === String(this.currentParams[p.id]) ? 'selected' : '';
          return `<option value="${this._escapeHtml(opt.value)}" ${selected}>${this._escapeHtml(opt.label)}</option>`;
        }).join('');

        row.innerHTML = `
          <div class="param-label-row">
            <label class="param-name" for="select-${p.id}">${p.label}</label>
          </div>
          <select class="cad-select" id="select-${p.id}">${optionsHtml}</select>
        `;

        const sel = row.querySelector(`#select-${p.id}`);
        if (schema.presetParamId === p.id) {
          presetSelectEl = sel;
        }
        sel.onchange = (e) => {
          const val = e.target.value;
          this.currentParams[p.id] = val;
          const preset = schema.presets && schema.presets[val];
          if (preset) {
            Object.entries(preset).forEach(([k, v]) => {
              if (k in this.currentParams) {
                this.currentParams[k] = v;
                if (controlSyncMap[k]) controlSyncMap[k](v);
              }
            });
            this._updateDependentStates(dependentRows);
            this.regeneratePart(true);
          } else {
            this.regeneratePart(false);
          }
        };
      } else if (p.type === 'checkbox') {
        row.innerHTML = `
          <div class="param-label-row">
            <label class="param-name" for="input-${p.id}" style="cursor:pointer;">${p.label}</label>
            <input type="checkbox" id="input-${p.id}" ${this.currentParams[p.id] ? 'checked' : ''} style="cursor:pointer;">
          </div>
        `;
        const chk = row.querySelector(`#input-${p.id}`);
        controlSyncMap[p.id] = (v) => { chk.checked = Boolean(v); };
        chk.onchange = (e) => {
          this.currentParams[p.id] = e.target.checked;
          this._updateDependentStates(dependentRows);
          this.regeneratePart();
        };
      } else {
        const initVal = this.currentParams[p.id];
        row.innerHTML = `
          <div class="param-label-row">
            <span class="param-name">${p.label}</span>
            <span class="param-value" id="val-${p.id}">${formatParamVal(p, initVal)}</span>
          </div>
          <div class="param-input-wrap">
            <input type="range" class="cad-slider" id="slider-${p.id}"
                   min="${p.min}" max="${p.max}" step="${p.step}" value="${initVal}">
            <input type="number" class="cad-num-input" id="num-${p.id}"
                   min="${p.min}" max="${p.max}" step="${p.step}" value="${initVal}">
          </div>
        `;

        const slider = row.querySelector(`#slider-${p.id}`);
        const num = row.querySelector(`#num-${p.id}`);
        const display = row.querySelector(`#val-${p.id}`);

        controlSyncMap[p.id] = (v) => {
          slider.value = v;
          num.value = v;
          display.textContent = formatParamVal(p, v);
        };

        const applyValue = (rawVal, clampAndSync = true) => {
          const parsed = parseFloat(rawVal);
          if (!Number.isFinite(parsed)) {
            if (clampAndSync) {
              const fallback = this.currentParams[p.id];
              controlSyncMap[p.id](fallback);
            }
            return;
          }
          const clamped = clampAndSync ? Math.min(p.max, Math.max(p.min, parsed)) : parsed;
          slider.value = clamped;
          if (clampAndSync) num.value = clamped;
          display.textContent = formatParamVal(p, clamped);
          this.currentParams[p.id] = clamped;

          // If user edits a preset-controlled dimension, switch preset selector to 'custom'
          if (schema.presetParamId && presetSelectEl && this.currentParams[schema.presetParamId] !== 'custom') {
            this.currentParams[schema.presetParamId] = 'custom';
            presetSelectEl.value = 'custom';
          }

          this.regeneratePart();
        };

        slider.oninput = (e) => applyValue(e.target.value, true);
        num.onchange = (e) => applyValue(e.target.value, true);
      }

      group.appendChild(row);
    });

    this._updateDependentStates(dependentRows);
    container.appendChild(group);
  }

  _updateDependentStates(dependentRows) {
    dependentRows.forEach(({ row, dependsOn }) => {
      const enabled = Boolean(this.currentParams[dependsOn]);
      row.classList.toggle('disabled', !enabled);
      row.querySelectorAll('input').forEach(inp => {
        inp.disabled = !enabled;
      });
    });
  }

  regeneratePart(fitCamera = false) {
    const schema = PART_SCHEMAS[this.currentPartKey];
    if (!schema) return;

    try {
      this.currentGeometry = schema.generator(this.currentParams);
      this.engine.setMesh(this.currentGeometry);
      this.syncClippingRange(fitCamera);
      if (fitCamera) {
        this.engine.setView('iso');
      }
      this.updateMetrics();
      this.updateStatusBar();
    } catch (err) {
      console.error('Error generating geometry:', err);
    }
  }

  /**
   * Precise analytical volume & surface calculation (zero temporary geometry allocations)
   */
  updateMetrics() {
    if (!this.currentGeometry) return;

    const posAttr = this.currentGeometry.attributes.position;
    const pos = posAttr.array;
    const indexAttr = this.currentGeometry.index;

    let volumeMm3 = 0;
    let areaMm2 = 0;

    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const cross = new THREE.Vector3();
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();

    const accumTriangle = (i1, i2, i3) => {
      const o1 = i1 * 3;
      const o2 = i2 * 3;
      const o3 = i3 * 3;
      p1.set(pos[o1], pos[o1 + 1], pos[o1 + 2]);
      p2.set(pos[o2], pos[o2 + 1], pos[o2 + 2]);
      p3.set(pos[o3], pos[o3 + 1], pos[o3 + 2]);

      // Signed tetrahedron volume = (p1 · (p2 × p3)) / 6
      cross.crossVectors(p2, p3);
      volumeMm3 += p1.dot(cross) / 6.0;

      // Triangle surface area = 0.5 * |(p2 - p1) × (p3 - p1)|
      vA.subVectors(p2, p1);
      vB.subVectors(p3, p1);
      areaMm2 += vA.cross(vB).length() * 0.5;
    };

    if (indexAttr) {
      const idx = indexAttr.array;
      for (let i = 0; i + 2 < idx.length; i += 3) {
        accumTriangle(idx[i], idx[i + 1], idx[i + 2]);
      }
    } else {
      const vertCount = posAttr.count;
      for (let i = 0; i + 2 < vertCount; i += 3) {
        accumTriangle(i, i + 1, i + 2);
      }
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
    document.getElementById('metric-mass').textContent = massGram >= 1000
      ? `${(massGram / 1000).toFixed(2)} kg`
      : `${massGram.toFixed(1)} g`;
    document.getElementById('metric-bbox').textContent = `${dx} × ${dy} × ${dz} mm`;

    this.lastMetrics = {
      volumeCm3: absVolumeCm3,
      areaCm2: areaCm2,
      massGram: massGram,
      bbox: `${dx} × ${dy} × ${dz} mm`,
      material: matInfo.name
    };
  }

  _getTriangleCount(geometry) {
    if (!geometry || !geometry.attributes.position) return 0;
    if (geometry.index) {
      return Math.floor(geometry.index.count / 3);
    }
    return Math.floor(geometry.attributes.position.count / 3);
  }

  updateStatusBar() {
    if (!this.currentGeometry) return;
    const triangleCount = this._getTriangleCount(this.currentGeometry);
    document.getElementById('sb-triangles').textContent = `${triangleCount.toLocaleString('en-US')} Triangles`;
    document.getElementById('sb-part-name').textContent = this.importedMeshInfo
      ? `Imported: ${this.importedMeshInfo.fileName}`
      : PART_SCHEMAS[this.currentPartKey].name;
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  showSpecSheet() {
    if (!this.lastMetrics) return;
    const modal = document.getElementById('spec-modal');
    const body = document.getElementById('modal-spec-content');
    const triangles = this._getTriangleCount(this.currentGeometry);

    let title = '';
    let detailsHtml = '';

    if (this.importedMeshInfo) {
      title = `Imported Mesh — ${this._escapeHtml(this.importedMeshInfo.fileName)}`;
      detailsHtml = `
        <h5 style="color:#d4af37; margin-bottom:8px; text-transform:uppercase; font-size:0.75rem;">Import Details</h5>
        <table style="width:100%; border-collapse: collapse; font-size:0.85rem;">
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">Source File</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right;">${this._escapeHtml(this.importedMeshInfo.fileName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">Detected Format</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right;">${this.importedMeshInfo.format}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">Triangle Count</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right;">${triangles.toLocaleString('en-US')}</td>
          </tr>
        </table>
      `;
    } else {
      const schema = PART_SCHEMAS[this.currentPartKey];
      title = schema.name;
      let paramRows = '';

      if (typeof schema.getSpecExtras === 'function') {
        schema.getSpecExtras(this.currentParams).forEach(extra => {
          paramRows += `<tr>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">${this._escapeHtml(extra.label)}</td>
            <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right; color:#00d2d3;">${this._escapeHtml(extra.value)}</td>
          </tr>`;
        });
      }

      schema.params.forEach(p => {
        if (p.dependsOn && !this.currentParams[p.dependsOn]) return;
        const val = this.currentParams[p.id];
        let formattedVal = '';
        if (p.type === 'select') {
          const matchedOpt = (p.options || []).find(o => String(o.value) === String(val));
          formattedVal = matchedOpt ? matchedOpt.label : String(val);
        } else if (typeof p.formatValue === 'function') {
          formattedVal = p.formatValue(val);
        } else if (typeof val === 'boolean') {
          formattedVal = val ? 'Yes' : 'No';
        } else {
          formattedVal = `${val}${p.unit ? ' ' + p.unit : ''}`;
        }
        paramRows += `<tr>
          <td style="padding: 6px 10px; border-bottom: 1px solid #323642; color:#a0a5b0;">${this._escapeHtml(p.label)}</td>
          <td style="padding: 6px 10px; border-bottom: 1px solid #323642; font-family: monospace; font-weight:600; text-align:right;">${this._escapeHtml(formattedVal)}</td>
        </tr>`;
      });
      detailsHtml = `
        <h5 style="color:#d4af37; margin-bottom:8px; text-transform:uppercase; font-size:0.75rem;">Design Parameters</h5>
        <table style="width:100%; border-collapse: collapse; font-size:0.85rem;">
          ${paramRows}
        </table>
      `;
    }

    body.innerHTML = `
      <div style="margin-bottom: 16px;">
        <h4 style="color:#00d2d3; margin-bottom:4px;">${title}</h4>
        <p style="font-size:0.82rem; color:#888;">Generated with Web-CAD Studio on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}</p>
      </div>

      <div style="background:#15171d; border-radius:6px; padding:12px; margin-bottom:16px;">
        <h5 style="color:#d4af37; margin-bottom:8px; text-transform:uppercase; font-size:0.75rem;">Physical Properties</h5>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem;">
          <div>Material: <strong>${this.lastMetrics.material}</strong></div>
          <div>Mass: <strong>${this.lastMetrics.massGram >= 1000 ? (this.lastMetrics.massGram / 1000).toFixed(3) + ' kg' : this.lastMetrics.massGram.toFixed(1) + ' g'}</strong></div>
          <div>Volume: <strong>${this.lastMetrics.volumeCm3.toFixed(2)} cm³</strong></div>
          <div>Surface Area: <strong>${this.lastMetrics.areaCm2.toFixed(1)} cm²</strong></div>
          <div>Mesh Triangles: <strong>${triangles.toLocaleString('en-US')}</strong></div>
          <div>Bounding Box: <strong>${this.lastMetrics.bbox}</strong></div>
        </div>
      </div>

      ${detailsHtml}
    `;

    modal.classList.add('visible');
  }

  hideSpecSheet() {
    document.getElementById('spec-modal').classList.remove('visible');
  }

  setupDragAndDrop() {
    const dropArea = this.engine.container;
    const dropZoneCard = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('file-import-input');

    const attachDropHandlers = (el) => {
      if (!el) return;
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          this.loadExternalFile(e.dataTransfer.files[0]);
        }
      });
    };

    attachDropHandlers(dropArea);
    attachDropHandlers(dropZoneCard);

    if (dropZoneCard && fileInput) {
      dropZoneCard.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.loadExternalFile(e.target.files[0]);
          fileInput.value = '';
        }
      });
    }
  }

  _parseBinarySTL(buffer) {
    if (buffer.byteLength < 84) return null;
    const view = new DataView(buffer);
    const triangles = view.getUint32(80, true);
    const expectedSize = 84 + triangles * 50;
    if (triangles === 0 || expectedSize !== buffer.byteLength) return null;

    const positions = new Float32Array(triangles * 9);
    const normals = new Float32Array(triangles * 9);
    let offset = 84;
    let posIdx = 0;
    let hasValidNormals = false;

    for (let i = 0; i < triangles; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      if (nx * nx + ny * ny + nz * nz > 1e-8) hasValidNormals = true;
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
      offset += 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (hasValidNormals) {
      geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      geom.computeVertexNormals();
    }
    return geom;
  }

  _parseAsciiSTL(text) {
    const positions = [];
    const regex = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      positions.push(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    }
    if (positions.length < 9) return null;

    const usableLen = positions.length - (positions.length % 9);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions.slice(0, usableLen)), 3));
    geom.computeVertexNormals();
    return geom;
  }

  _parseOBJ(text) {
    const verts = [];
    const positions = [];
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('v ')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          verts.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
        }
      } else if (line.startsWith('f ')) {
        const parts = line.split(/\s+/).slice(1);
        const faceIdx = parts.map(tok => {
          const idx = parseInt(tok.split('/')[0], 10);
          return idx < 0 ? verts.length + idx : idx - 1;
        });
        // Fan triangulation for triangles & convex n-gons
        for (let i = 1; i + 1 < faceIdx.length; i++) {
          const a = verts[faceIdx[0]];
          const b = verts[faceIdx[i]];
          const c = verts[faceIdx[i + 1]];
          if (a && b && c) {
            positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
          }
        }
      }
    }

    if (positions.length < 9) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.computeVertexNormals();
    return geom;
  }

  loadExternalFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const lowerName = file.name.toLowerCase();
        let geom = null;
        let format = '';

        if (lowerName.endsWith('.obj')) {
          const text = new TextDecoder('utf-8').decode(buffer);
          geom = this._parseOBJ(text);
          format = 'Wavefront OBJ';
        } else {
          // Try strict Binary STL first, fall back to ASCII STL
          geom = this._parseBinarySTL(buffer);
          if (geom) {
            format = 'Binary STL';
          } else {
            const text = new TextDecoder('utf-8').decode(buffer);
            geom = this._parseAsciiSTL(text);
            format = 'ASCII STL';
          }
        }

        if (!geom) {
          throw new Error('Unsupported or malformed mesh file');
        }

        this.importedMeshInfo = { fileName: file.name, format };
        this.currentGeometry = geom;
        this.engine.setMesh(geom);
        this.syncClippingRange(true);
        this.engine.setView('iso');
        this.updateMetrics();
        this.updateStatusBar();

        // Update catalog active state & right sidebar info
        document.querySelectorAll('.part-card').forEach(c => c.classList.remove('active'));
        const paramContainer = document.getElementById('parameters-container');
        paramContainer.innerHTML = `
          <div class="param-group">
            <div class="param-group-title">Imported Mesh</div>
            <p style="font-size: 0.82rem; color: var(--text-main); margin-bottom: 6px; word-break: break-word;">
              <strong>${this._escapeHtml(file.name)}</strong>
            </p>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 12px;">
              Format: ${format} · Use Section Plane, Dimensions, or Export above to inspect.
            </p>
            <button class="tool-btn" id="btn-back-parametric" style="width:100%; justify-content:center;">
              ↩ Return to Parametric Library
            </button>
          </div>
        `;
        document.getElementById('btn-back-parametric').onclick = () => this.loadPart(this.currentPartKey || 'gear');
      } catch (err) {
        console.error('Import error:', err);
        alert('Error loading file. Please choose a valid Binary STL, ASCII STL, or Wavefront OBJ file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

// Boot application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.cadApp = new AppController();
});
